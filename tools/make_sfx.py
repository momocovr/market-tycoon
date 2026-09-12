"""Synthesize the game's sound effects (same recipes as src/ui/sfx.ts) as 44.1 kHz MP3s for Vket Cloud.
Usage: python tools/make_sfx.py <out_dir>
"""
import math, struct, sys, os, random

SR = 44100

def tone(buf, freq, dur, kind, vol, at=0.0, slide=1.0):
    n0 = int(at * SR); n = int(dur * SR)
    for i in range(n):
        t = i / SR
        f = freq * (slide ** (i / max(n, 1)))
        ph = 2 * math.pi * f * t
        if kind == 'sine': v = math.sin(ph)
        elif kind == 'square': v = 1.0 if math.sin(ph) > 0 else -1.0
        elif kind == 'triangle': v = 2 / math.pi * math.asin(math.sin(ph))
        else: v = 2 * ((f * t) % 1.0) - 1  # saw
        env = min(1.0, i / (0.01 * SR)) * math.exp(-4.0 * i / n)
        idx = n0 + i
        if idx < len(buf): buf[idx] += v * vol * env

def noise(buf, dur, vol, at=0.0):
    n0 = int(at * SR); n = int(dur * SR); prev = 0.0
    for i in range(n):
        v = random.uniform(-1, 1)
        prev = 0.6 * prev + 0.4 * v  # crude low-pass
        idx = n0 + i
        if idx < len(buf): buf[idx] += prev * vol * (1 - i / n)

def make(name, length, fn):
    buf = [0.0] * int(length * SR)
    fn(buf)
    peak = max(1e-6, max(abs(x) for x in buf))
    pcm = struct.pack('<%dh' % len(buf), *[int(max(-1, min(1, x / peak * 0.85)) * 32767) for x in buf])
    return name, pcm

def coin(b): tone(b, 1046, 0.08, 'square', 0.5); tone(b, 1568, 0.16, 'square', 0.5, 0.07)
def place(b): tone(b, 180, 0.14, 'triangle', 0.9, 0, 0.5); tone(b, 660, 0.08, 'sine', 0.5, 0.02)
def levelup(b):
    for i, f in enumerate([523, 659, 784, 1046, 1318]): tone(b, f, 0.22, 'triangle', 0.6, i * 0.08)
def unlock(b):
    for i, f in enumerate([523, 659, 784, 1046]): tone(b, f, 0.18, 'triangle', 0.6, i * 0.09)
def goal(b):
    for i, f in enumerate([784, 988, 1175, 1568]): tone(b, f, 0.25, 'sine', 0.7, i * 0.1)
def register(b):
    noise(b, 0.03, 0.8, 0)
    for f, v, d in [(3050, 0.5, 0.9), (4180, 0.4, 0.8), (5410, 0.25, 0.7), (7220, 0.15, 0.5), (2040, 0.25, 1.0)]: tone(b, f, d, 'sine', v, 0.05, 0.998)
def deny(b): tone(b, 150, 0.12, 'square', 0.6)
def unhappy(b): tone(b, 220, 0.25, 'saw', 0.5, 0, 0.7)

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    import lameenc
    for name, pcm in [make('coin', 0.3, coin), make('place', 0.25, place), make('levelup', 0.7, levelup), make('unlock', 0.6, unlock),
                      make('goal', 0.7, goal), make('register', 1.1, register), make('deny', 0.2, deny), make('unhappy', 0.35, unhappy)]:
        enc = lameenc.Encoder(); enc.set_bit_rate(128); enc.set_in_sample_rate(SR); enc.set_channels(1); enc.set_quality(2)
        mp3 = enc.encode(pcm) + enc.flush()
        with open(os.path.join(out, 'se_%s.mp3' % name), 'wb') as f: f.write(mp3)
        print(name, len(mp3))
