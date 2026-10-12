"""Validate PCM output before publishing it as a reusable voice file."""
import wave

def inspect_wav(path, mode, engine_rate=None, frames=None):
    with wave.open(str(path), 'rb') as wav:
        rate, count, channels = wav.getframerate(), wav.getnframes(), wav.getnchannels()
    expected = {'v3turbo': 48000, 'v3nano': 24000}.get(mode, engine_rate)
    if not expected or rate != expected or (engine_rate is not None and rate != engine_rate):
        raise ValueError('Sample rate của voice không khớp model. Kiểm tra phiên bản môi trường và tạo lại voice; không đổi header để chữa tốc độ.')
    if count <= 0 or (frames is not None and count != frames):
        raise ValueError('Số mẫu audio không khớp waveform. Tạo lại voice trước khi dùng.')
    return {'sampleRate': rate, 'frames': count, 'channels': channels, 'duration': count/rate}
