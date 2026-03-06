import sys
from faster_whisper import WhisperModel

if len(sys.argv) < 4:
    print(f"Usage: {sys.argv[0]} <model_path> <input_file> <num_workers>", file=sys.stderr)
    sys.exit(1)

model_path = sys.argv[1]
input_file = sys.argv[2]
num_workers = int(sys.argv[3])

model = WhisperModel(model_path, device="cpu", compute_type="int8", cpu_threads=6, num_workers=num_workers)
segments, info = model.transcribe(input_file, language="uk", beam_size=1, vad_filter=True, condition_on_previous_text=False)

for segment in segments:
    def fmt(seconds):
        h, r = divmod(seconds, 3600)
        m, s = divmod(r, 60)
        ms = int((s % 1) * 1000)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d}.{ms:03d}"
    print(f"[{fmt(segment.start)} --> {fmt(segment.end)}]  {segment.text}", flush=True)
