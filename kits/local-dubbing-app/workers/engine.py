"""Local engines only. JSON progress goes to stdout; model diagnostics stay on stderr."""
import contextlib
import json
import sys
import hashlib
import importlib.util
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
                    signature = hashlib.sha256(json.dumps([sys.executable, mode, voice, segment['translation']], ensure_ascii=False).encode()).hexdigest()
                    if not output.exists() or not marker.exists() or marker.read_text() != signature:
                        cached_batch = False
                        break
                if cached_batch:
                    with contextlib.redirect_stdout(sys.__stdout__):
                        emit(progress=len(segments), total=len(segments), done=True)
                    return
            from vieneu import Vieneu
            tts = Vieneu(mode=mode)
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
                    signature = hashlib.sha256(json.dumps([sys.executable, mode, voice, segment['translation']], ensure_ascii=False).encode()).hexdigest()
                    marker = Path(output + '.json')
                    cached = Path(output).exists() and marker.exists() and marker.read_text() == signature
                    if not cached:
                        kwargs = {'voice': voice} if voice else {}
                        audio = tts.infer(segment['translation'], **kwargs)
                        temp = output + '.tmp.wav'
                        tts.save(audio, temp)
                        Path(temp).replace(output)
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
