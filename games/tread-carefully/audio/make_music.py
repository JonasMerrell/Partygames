#!/usr/bin/env python3
"""Writes the chiptune loops for Tread Carefully: bg_main.ogg (lobby and setup)
and bg_battle.ogg (rounds). Run from this folder: python3 make_music.py
Needs numpy and ffmpeg."""
import numpy as np, subprocess, wave, os

SR = 44100

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def square(f, dur, duty=0.5, vol=0.2):
    t = np.arange(int(SR * dur)) / SR
    w = np.where((t * f) % 1 < duty, 1.0, -1.0)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 3.0)
    return w * env * vol

def tri(f, dur, vol=0.35):
    t = np.arange(int(SR * dur)) / SR
    w = 2 * np.abs(2 * ((t * f) % 1) - 1) - 1
    env = np.minimum(1, t / 0.003) * np.minimum(1, (dur - t) / 0.01)
    return w * env * vol

def noise(dur, vol=0.15, decay=40, seed=0):
    rng = np.random.default_rng(seed)
    t = np.arange(int(SR * dur)) / SR
    # 4-bit style noise: hold each random value for a few samples
    n = np.repeat(rng.uniform(-1, 1, len(t) // 4 + 1), 4)[:len(t)]
    return n * np.exp(-t * decay) * vol

def kick(vol=0.6):
    dur = 0.18
    t = np.arange(int(SR * dur)) / SR
    f = 150 * np.exp(-t * 25) + 40
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 18) * vol

def mix(buf, snd, at):
    i = int(at * SR)
    j = min(len(buf), i + len(snd))
    if i < len(buf): buf[i:j] += snd[: j - i]

CHORDS = {'m': [0, 3, 7], 'M': [0, 4, 7]}

def song(bpm, prog, lead_pat, bass_style, drums, bars_rep, seed, duty):
    beat = 60 / bpm
    bar = beat * 4
    total = bar * len(prog) * bars_rep
    buf = np.zeros(int(SR * total) + SR)
    rng = np.random.default_rng(seed)
    step = beat / 2  # eighth notes
    for rep in range(bars_rep):
        for bi, (root, q) in enumerate(prog):
            t0 = (rep * len(prog) + bi) * bar
            ch = CHORDS[q]
            # bass
            for s in range(8):
                if bass_style == 'drive':
                    n = root - 24 + (12 if s % 2 else 0)
                else:
                    n = root - 24 + [0, 7, 12, 7, 0, 7, 12, 14][s] if q == 'M' else root - 24 + [0, 7, 12, 7, 0, 7, 12, 15][s]
                mix(buf, tri(midi(n), step * 0.9), t0 + s * step)
            # lead: pattern of chord tones / passing notes, varied each rep
            pat = lead_pat[(bi + rep) % len(lead_pat)]
            for s, d in enumerate(pat):
                if d is None: continue
                deg, length = d
                scale = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15] if q == 'm' else [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]
                n = root + 12 + scale[deg % len(scale)]
                mix(buf, square(midi(n), step * length * 0.95, duty, 0.11), t0 + s * step)
                # echo an octave up, quieter, for sparkle
                mix(buf, square(midi(n + 12), step * 0.5, 0.25, 0.03), t0 + s * step + step * 0.5)
            # arpeggio pad
            for s in range(16):
                n = root + ch[s % 3] + 12
                mix(buf, square(midi(n), beat / 4 * 0.6, 0.125, 0.025), t0 + s * beat / 4)
            # drums
            for s in range(8):
                if drums[s] == 'k': mix(buf, kick(), t0 + s * step)
                if drums[s] == 's': mix(buf, noise(0.16, 0.22, 18, seed + s), t0 + s * step)
                mix(buf, noise(0.04, 0.05, 90, seed + s + 9), t0 + s * step)
    buf = buf[: int(SR * total)]
    buf /= max(1e-6, np.max(np.abs(buf))) / 0.85
    return buf

def write(name, buf):
    wav = name + '.wav'
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '3', name + '.ogg'], check=True)
    os.remove(wav)

L = lambda *xs: list(xs)
main_lead = [
    L((4, 2), None, (2, 1), (4, 1), (5, 2), None, (4, 2), None),
    L((7, 3), None, None, (5, 1), (4, 2), None, (2, 2), None),
    L((0, 1), (2, 1), (4, 1), (2, 1), (5, 2), None, (4, 2), None),
    L((4, 4), None, None, None, (7, 1), (5, 1), (4, 2), None),
]
battle_lead = [
    L((0, 1), (0, 1), (4, 1), (0, 1), (5, 1), (4, 1), (2, 1), (4, 1)),
    L((7, 2), None, (5, 1), (4, 1), (2, 2), None, (4, 2), None),
    L((0, 1), (0, 1), (4, 1), (0, 1), (7, 1), (5, 1), (4, 1), (5, 1)),
    L((9, 2), None, (7, 2), None, (5, 1), (4, 1), (2, 2), None),
]
if __name__ == '__main__':
    write('bg_main', song(118, [(57, 'm'), (53, 'M'), (60, 'M'), (55, 'M')], main_lead, 'bounce', 'k.s.k.s.', 4, 3, 0.5))
    write('bg_battle', song(148, [(52, 'm'), (52, 'm'), (48, 'M'), (50, 'M'), (52, 'm'), (55, 'M'), (57, 'm'), (59, 'M')], battle_lead, 'drive', 'k.skk.s.', 2, 7, 0.25))
