"""Local engines only. JSON progress goes to stdout; model diagnostics stay on stderr."""
import contextlib
import json
import sys
import hashlib
import wave
import importlib.util
import importlib.metadata
from audio_meta import inspect_wav
from pathlib import Path


def emit(**value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


def installed_voices(mode):
    """Read v3 presets shipped with the selected SDK, without importing/loading a model.

    Standard presets are resolved by the SDK from its backbone repository, so use
    its public list_preset_voices method for that mode or older package layouts.
    """
    filename = {'v3turbo': 'voices_v3_turbo.json', 'v3nano': 'voices_v3_nano.json'}.get(mode)
    if not filename:
        return None
    spec = importlib.util.find_spec('vieneu')
    if not spec or not spec.origin:
        raise ValueError('Chưa có bộ giọng local trong môi trường Windi TTS. Liên kết môi trường ở Kiểm tra máy.')
    path = Path(spec.origin).parent / 'assets' / filename
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding='utf-8'))
    presets = data.get('presets')
    if not isinstance(presets, dict):
        raise ValueError('Danh sách giọng local đã cài không hợp lệ. Kiểm tra lại môi trường.')
    entries = list(presets.items())
    if mode == 'v3turbo':
        entries.sort(key=lambda pair: (pair[1].get('featured') is None, pair[1].get('featured') or 0))
    return [{'id': name, 'label': name + (' — ' + entry['description'] if entry.get('description') else ''),
             'default': name == data.get('default_voice')} for name, entry in entries]


def engine_options(mode):
    if mode == 'v3turbo':
        return {'backend': 'onnx', 'device': 'cpu', 'precision': 'fp32'} if sys.platform == 'darwin' else {'precision': 'fp32'}
    return {}


def sdk_version():
    try:
        return importlib.metadata.version('vieneu')
    except importlib.metadata.PackageNotFoundError:
        return 'unknown'


def fingerprint(mode, voice, text):
    return hashlib.sha256(json.dumps(['validated-pcm-v1', sys.executable, sdk_version(), mode, engine_options(mode), voice, text], ensure_ascii=False).encode()).hexdigest()


def valid_cache(output, signature, mode):
    output = Path(output)
    marker = Path(str(output) + '.json')
    metadata = Path(str(output) + '.audio.json')
    if not output.exists() or not marker.exists() or not metadata.exists() or marker.read_text() != signature:
        return False
    try:
        saved = json.loads(metadata.read_text(encoding='utf-8'))
        inspect_wav(output, mode, saved['sampleRate'], saved['frames'])
        return True
    except (ValueError, KeyError, OSError, EOFError, wave.Error):
        return False


def main():
    action, request_path = sys.argv[1:3]
    request = json.loads(Path(request_path).read_text(encoding='utf-8'))
    with contextlib.redirect_stdout(sys.stderr):
        if action == 'transcribe':
            import whisper
            model = whisper.load_model(request.get('model', 'small'), device=request.get('device', 'cpu'), download_root=request.get('cache'))
            result = model.transcribe(request['audio'], language=request.get('language') or None, fp16=False, verbose=False, word_timestamps=True)
            segments = []
            for i, s in enumerate(result['segments']):
                if not s['text'].strip():
                    continue
                words = [w for w in s.get('words', []) if w.get('word', '').strip()]
                start = float(words[0]['start'] if words else s['start'])
                end = float(words[-1]['end'] if words else s['end'])
                if end > start:
                    segments.append(dict(id=str(i), start=start, end=end, text=s['text'].strip(), translation=''))
            Path(request['output']).write_text(json.dumps(segments, ensure_ascii=False), encoding='utf-8')
        elif action in ('voices', 'tts', 'sample'):
            # No remote/API engine and no silently substituted model.
            mode = request.get('mode', 'v3turbo')
            if mode not in ('v3turbo', 'v3nano', 'standard'):
                raise ValueError('Unsupported local TTS mode')
            if action == 'voices':
                catalog = installed_voices(mode)
                if catalog is not None:
                    Path(request['output']).write_text(json.dumps(catalog, ensure_ascii=False), encoding='utf-8')
                    with contextlib.redirect_stdout(sys.__stdout__):
                        emit(done=True)
                    return
                if mode != 'standard':
                    raise ValueError('Danh sách giọng local thiếu trong SDK. Cập nhật môi trường trước; chưa tải model.')
            else:
                # Replaying a saved sentence must not initialize a large model again.
                segments = request['segments'] if action == 'tts' else [{'id': 'sample', 'translation': request['text']}]
                cached_batch = True
                for segment in segments:
                    voice = segment.get('voice', request.get('voice')) or None
                    output = Path(request['directory']) / (segment['id'] + '.wav')
                    marker = Path(str(output) + '.json')
                    signature = fingerprint(mode, voice, segment['translation'])
                    if not valid_cache(output, signature, mode):
                        cached_batch = False
                        break
                if cached_batch:
                    with contextlib.redirect_stdout(sys.__stdout__):
                        emit(progress=len(segments), total=len(segments), done=True)
                    return
            from vieneu import Vieneu
            tts = Vieneu(mode=mode, **engine_options(mode))
            voices = tts.list_preset_voices()
            if action == 'voices':
                Path(request['output']).write_text(json.dumps([{'label': str(label), 'id': str(vid)} for label, vid in voices], ensure_ascii=False), encoding='utf-8')
            else:
                voice = request.get('voice') or None
                segments = request['segments'] if action == 'tts' else [{'id': 'sample', 'translation': request['text']}]
                for segment in segments:
                    selected = segment.get('voice', voice)
                    if selected and selected not in [str(v) for pair in voices for v in pair]:
                        raise ValueError('Giọng đã chọn không có trong model này. Tải lại danh sách giọng.')
                for i, segment in enumerate(segments):
                    voice = segment.get('voice', request.get('voice')) or None
                    output = str(Path(request['directory']) / (segment['id'] + '.wav'))
                    signature = fingerprint(mode, voice, segment['translation'])
                    marker = Path(output + '.json')
                    cached = valid_cache(output, signature, mode)
                    if not cached:
                        kwargs = {'voice': voice} if voice else {}
                        audio = tts.infer(segment['translation'], **kwargs)
                        temp = output + '.tmp.wav'
                        tts.save(audio, temp)
                        info = inspect_wav(temp, mode, getattr(tts, 'sample_rate', None), len(audio))
                        info.update({'mode':mode,'sdkVersion':sdk_version(),'backend':getattr(tts,'backend',type(getattr(tts,'engine',tts)).__name__),'precision':engine_options(mode).get('precision'),'voice':voice,'backbone':getattr(tts,'backbone_repo',None)})
                        Path(temp).replace(output)
                        Path(output + '.audio.json').write_text(json.dumps(info,ensure_ascii=False),encoding='utf-8')
                        marker.write_text(signature)
                        Path(output + '.api.json').unlink(missing_ok=True)
                    with contextlib.redirect_stdout(sys.__stdout__):
                        emit(progress=i + 1, total=len(segments))
        else:
            raise ValueError('Unknown engine action')
    emit(done=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        emit(error=str(error))
        raise
