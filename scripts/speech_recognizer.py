"""Local Japanese ASR. Downloads a model only during explicit preparation."""
import json
import sys
from pathlib import Path

MODEL = Path(__file__).resolve().parents[1] / '.gar/speech-model'

def main():
    from faster_whisper import WhisperModel, download_model
    import numpy as np
    if sys.argv[1:] == ['prepare']:
        download_model('base', output_dir=str(MODEL))
        WhisperModel(str(MODEL), device='cpu', compute_type='int8', cpu_threads=2, local_files_only=True)
        print('Local speech model ready')
        return
    if sys.argv[1:] != ['transcribe']:
        raise ValueError('Expected prepare or transcribe')
    audio = sys.stdin.buffer.read(320001)
    if len(audio) < 6400 or len(audio) > 320000 or len(audio) % 2:
        raise ValueError('Invalid PCM length')
    samples = np.frombuffer(audio, dtype='<i2').astype(np.float32) / 32768.0
    if np.sqrt(np.mean(samples * samples)) < 0.002:
        raise ValueError('No speech input')
    model = WhisperModel(str(MODEL), device='cpu', compute_type='int8', cpu_threads=2, local_files_only=True)
    segments, _ = model.transcribe(samples, language='ja', beam_size=3, vad_filter=True, condition_on_previous_text=False)
    text = ''.join(s.text for s in segments).strip().replace('\n', ' ')
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps({'text': text}, ensure_ascii=False))

if __name__ == '__main__':
    main()
