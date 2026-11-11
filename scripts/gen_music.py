# -*- coding: utf-8 -*-
"""生成内置背景音乐库（本地合成 WAV 无缝循环，无版权风险）。

- 旧 4 首：22050Hz 24s（保持既有文件名兼容）
- 新 37 首：16000Hz 12s 无缝循环（约 384KB/首）
- 纯 Python 合成（正弦查找表加速），输出 public/audio/builtin-*.wav
"""
import math
import os
import struct
import wave

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'audio')

# ---------------- 公共工具 ----------------
_SR = 16000
_T = 12.0
_N = int(_SR * _T)
_TABLE = [math.sin(2 * math.pi * i / 4096) for i in range(4096)]


def _snap(freq, t):
    k = round(freq * t)
    return k / t


def _write_wav(path, samples, sr):
    peak = max(1e-9, max(abs(s) for s in samples))
    norm = 0.86 / peak
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        frames = bytearray()
        pack = struct.pack
        for s in samples:
            frames += pack('<h', int(max(-1.0, min(1.0, s * norm)) * 32767))
        w.writeframes(bytes(frames))


def _osc(buf, freq, amp, sr, n, phase=0.0, decay=None, table=None):
    """往 buf 叠加正弦（查表），decay 为每秒衰减率。"""
    tbl = table or _TABLE
    step = freq * 4096.0 / sr
    idx = phase * 4096.0 / (2 * math.pi)
    if decay is None:
        for i in range(n):
            buf[i] += tbl[int(idx) & 4095] * amp
            idx += step
    else:
        inv = 1.0 / sr
        for i in range(n):
            buf[i] += tbl[int(idx) & 4095] * amp * math.exp(-i * inv * decay)
            idx += step


def _pluck(buf, freq, amp, start_sec, sr, n, dur_sec=1.4, decay=2.2, bright=1.0):
    """带包络拨弦（谐波衰减），跨循环边界回绕。"""
    start = int(start_sec * sr)
    length = int(dur_sec * sr)
    partials = [(1, 1.0), (2, 0.42 * bright), (3, 0.2 * bright), (4, 0.09 * bright)]
    for h, ha in partials:
        f = freq * h
        step = f * 4096.0 / sr
        idx = 0.0
        inv = 1.0 / sr
        for i in range(length):
            env = math.exp(-i * inv * decay) * ha
            bidx = (start + i) % n
            buf[bidx] += _TABLE[int(idx) & 4095] * amp * env
            idx += step


def _pad(buf, freqs, amp, sr, n, lfo_hz=0.08, lfo_depth=0.25):
    """呼吸感和声垫（LFO 频率吸附到整数周期，保证无缝循环）。"""
    t = n / sr
    lfo_hz = max(1e-4, round(lfo_hz * t) / t) if lfo_hz > 0 else lfo_hz
    for fi, f0 in enumerate(freqs):
        step = f0 * 4096.0 / sr
        idx = 0.0
        lw = 2 * math.pi * lfo_hz / sr
        phase = fi * 0.7
        a = amp / len(freqs)
        for i in range(n):
            lfo = 1.0 + lfo_depth * math.sin(lw * i + phase)
            buf[i] += _TABLE[int(idx) & 4095] * a * lfo
            idx += step


def _render(recipe):
    """按配方渲染 12s 无缝循环。"""
    sr, t = _SR, _T
    n = _N
    buf = [0.0] * n
    # 低音
    if recipe.get('bass'):
        for f, a in recipe['bass']:
            _osc(buf, _snap(f, t), a, sr, n)
    # 和声垫
    if recipe.get('pad'):
        _pad(buf, [_snap(f, t) for f in recipe['pad']], recipe.get('pad_amp', 0.22), sr, n,
             lfo_hz=recipe.get('lfo', 0.06), lfo_depth=recipe.get('lfo_depth', 0.28))
    if recipe.get('pad2'):
        _pad(buf, [_snap(f, t) for f in recipe['pad2']], recipe.get('pad2_amp', 0.12), sr, n,
             lfo_hz=recipe.get('lfo2', 0.04), lfo_depth=recipe.get('lfo2_depth', 0.32))
    # 主旋律拨弦
    scale = recipe['scale']
    pattern = recipe.get('pattern', [0, 2, 4, 2, 5, 4, 2, 0])
    step_t = recipe.get('step', 1.5)
    bright = recipe.get('bright', 1.0)
    for i, s in enumerate(pattern):
        f = scale[s % len(scale)]
        _pluck(buf, _snap(f, t), recipe.get('pluck_amp', 0.13), i * step_t, sr, n,
               dur_sec=recipe.get('pluck_dur', 1.5), decay=recipe.get('pluck_decay', 1.9), bright=bright)
    # 点缀铃
    if recipe.get('bell'):
        for j, (bt, bf) in enumerate(recipe['bell']):
            _pluck(buf, _snap(bf, t), recipe.get('bell_amp', 0.05), bt, sr, n, dur_sec=1.1, decay=2.6, bright=1.3)
    return buf


# ---------------- 音阶 ----------------
def major(root):
    return [root * 2 ** (s / 12) for s in (0, 2, 4, 7, 9, 12, 14, 16)]


def minor(root):
    return [root * 2 ** (s / 12) for s in (0, 2, 3, 5, 7, 8, 10, 12)]


def penta(root):
    return [root * 2 ** (s / 12) for s in (0, 2, 4, 7, 9, 12, 14, 16)]


def penta_cn(root):
    """中国五声（宫商角徵羽）"""
    return [root * 2 ** (s / 12) for s in (0, 2, 4, 7, 9, 12, 14, 16)]


# ---------------- 旧 4 首（22050Hz 24s，保持兼容） ----------------
SR_OLD = 22050
T_OLD = 24.0
N_OLD = int(SR_OLD * T_OLD)


def _old_snap(freq):
    return _snap(freq, T_OLD)


def _old_pad(buf, freqs, amp, lfo_hz=0.08, lfo_depth=0.25):
    for fi, f0 in enumerate(freqs):
        f = _old_snap(f0)
        w = 2 * math.pi * f / SR_OLD
        lw = 2 * math.pi * _old_snap(lfo_hz) / T_OLD
        phase = fi * 0.7
        for i in range(N_OLD):
            lfo = 1.0 + lfo_depth * math.sin(lw * i + phase)
            buf[i] += math.sin(w * i + phase) * amp * lfo / len(freqs)


def _old_pluck(buf, freq, amp, start_sec, dur_sec=1.4, decay=2.2):
    f = _old_snap(freq)
    start = int(start_sec * SR_OLD)
    length = int(dur_sec * SR_OLD)
    for h, ha in ((1, 1.0), (2, 0.45), (3, 0.22), (4, 0.1)):
        fh = _old_snap(f * h)
        w = 2 * math.pi * fh / SR_OLD
        for i in range(length):
            env = math.exp(-(i / SR_OLD) * decay) * ha
            buf[(start + i) % N_OLD] += math.sin(w * i) * amp * env


def _old_tone(buf, freq, amp, harmonics=((1, 1.0),)):
    f = _old_snap(freq)
    for h, ha in harmonics:
        fh = _old_snap(f * h)
        w = 2 * math.pi * fh / SR_OLD
        for i in range(N_OLD):
            buf[i] += math.sin(w * i) * amp * ha


def gen_romantic():
    buf = [0.0] * N_OLD
    _old_pad(buf, [130.81, 196.00, 329.63], 0.30, lfo_hz=0.06, lfo_depth=0.3)
    _old_pad(buf, [174.61, 261.63, 392.00], 0.16, lfo_hz=0.045, lfo_depth=0.35)
    _old_tone(buf, 523.25, 0.05, harmonics=((1, 1.0), (2, 0.2)))
    for bar in range(8):
        base = bar * 3.0
        _old_pluck(buf, 392.00, 0.10, base + 0.2, decay=1.6)
        _old_pluck(buf, 440.00, 0.09, base + 1.0, decay=1.6)
        _old_pluck(buf, 523.25, 0.08, base + 1.8, decay=1.7)
        _old_pluck(buf, 659.25, 0.07, base + 2.4, decay=1.8)
    return buf


def gen_chinese():
    buf = [0.0] * N_OLD
    _old_pad(buf, [98.00, 146.83], 0.22, lfo_hz=0.05, lfo_depth=0.22)
    _old_tone(buf, 196.00, 0.06, harmonics=((1, 1.0), (2, 0.15), (3, 0.07)))
    scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]
    pattern = [0, 2, 4, 3, 2, 5, 4, 2, 6, 4, 2, 0, 3, 2, 4, 5]
    for i, step in enumerate(pattern):
        _old_pluck(buf, scale[step], 0.16 if i % 4 == 0 else 0.11, i * 1.5, dur_sec=1.6, decay=1.9)
    return buf


def gen_lazy():
    buf = [0.0] * N_OLD
    _old_pad(buf, [110.00, 164.81, 196.00, 246.94], 0.26, lfo_hz=0.04, lfo_depth=0.32)
    _old_pad(buf, [116.54, 174.61, 220.00, 261.63], 0.15, lfo_hz=0.035, lfo_depth=0.34)
    for bar in range(6):
        base = bar * 4.0
        _old_pluck(buf, 880.00, 0.05, base + 1.4, dur_sec=1.2, decay=2.6)
        _old_pluck(buf, 987.77, 0.045, base + 3.0, dur_sec=1.2, decay=2.6)
    return buf


def gen_dream():
    buf = [0.0] * N_OLD
    _old_pad(buf, [220.00, 277.18, 329.63], 0.22, lfo_hz=0.07, lfo_depth=0.4)
    _old_pad(buf, [329.63, 415.30, 493.88], 0.10, lfo_hz=0.11, lfo_depth=0.45)
    for bar in range(12):
        base = bar * 2.0
        _old_pluck(buf, 1046.50, 0.05, base + 0.6, dur_sec=1.1, decay=2.4)
        _old_pluck(buf, 1174.66, 0.045, base + 1.3, dur_sec=1.1, decay=2.4)
    return buf


# ---------------- 新 37 首配方 ----------------
def recipes():
    R = []

    def add(file, fn):
        R.append((file, fn))

    # --- 婚礼 6 ---
    add('builtin-w-piano.wav', lambda: _render({
        'pad': [261.63, 329.63, 392.00], 'pad_amp': 0.24, 'lfo': 0.05, 'lfo_depth': 0.28,
        'pad2': [174.61, 261.63], 'pad2_amp': 0.12,
        'scale': major(261.63), 'pattern': [0, 2, 4, 5, 4, 2, 0, 4], 'step': 1.5,
        'pluck_amp': 0.15, 'pluck_decay': 1.7, 'bright': 1.1,
        'bell': [(3.2, 1046.5), (7.8, 1318.5)], 'bell_amp': 0.045,
    }))
    add('builtin-w-strings.wav', lambda: _render({
        'pad': [196.00, 246.94, 293.66, 369.99], 'pad_amp': 0.30, 'lfo': 0.045, 'lfo_depth': 0.34,
        'pad2': [293.66, 369.99, 440.00], 'pad2_amp': 0.13, 'lfo2': 0.03,
        'scale': major(196.00), 'pattern': [0, 4, 2, 5, 4, 0, 2, 4], 'step': 2.0,
        'pluck_amp': 0.10, 'pluck_decay': 1.3, 'bright': 0.7,
    }))
    add('builtin-w-violin.wav', lambda: _render({
        'bass': [(98.00, 0.10)],
        'pad': [246.94, 293.66, 329.63], 'pad_amp': 0.22, 'lfo': 0.06, 'lfo_depth': 0.3,
        'scale': major(246.94), 'pattern': [0, 2, 4, 2, 6, 4, 2, 0], 'step': 1.2,
        'pluck_amp': 0.16, 'pluck_decay': 1.2, 'bright': 0.85, 'pluck_dur': 1.8,
    }))
    add('builtin-w-guitar.wav', lambda: _render({
        'pad': [164.81, 220.00, 261.63], 'pad_amp': 0.18, 'lfo': 0.07, 'lfo_depth': 0.25,
        'scale': major(220.00), 'pattern': [0, 2, 3, 4, 3, 2, 0, 2], 'step': 1.1,
        'pluck_amp': 0.18, 'pluck_decay': 2.3, 'bright': 1.25,
    }))
    add('builtin-w-classical.wav', lambda: _render({
        'pad': [130.81, 196.00, 246.94, 329.63], 'pad_amp': 0.24, 'lfo': 0.04, 'lfo_depth': 0.3,
        'pad2': [261.63, 329.63], 'pad2_amp': 0.10,
        'scale': major(261.63), 'pattern': [0, 4, 2, 6, 4, 2, 0, 4], 'step': 1.8,
        'pluck_amp': 0.12, 'pluck_decay': 1.5, 'bright': 0.95,
        'bell': [(2.4, 783.99), (6.2, 1046.5), (9.6, 880.0)], 'bell_amp': 0.04,
    }))
    add('builtin-w-ceremony.wav', lambda: _render({
        'bass': [(65.41, 0.14), (98.00, 0.07)],
        'pad': [130.81, 196.00, 261.63], 'pad_amp': 0.30, 'lfo': 0.035, 'lfo_depth': 0.26,
        'scale': major(196.00), 'pattern': [0, 0, 4, 4, 2, 2, 0, 4], 'step': 2.4,
        'pluck_amp': 0.13, 'pluck_decay': 1.1, 'bright': 0.8, 'pluck_dur': 2.2,
    }))

    # --- 中式 6 ---
    add('builtin-c-guzheng.wav', lambda: _render({
        'bass': [(98.00, 0.11)],
        'pad': [146.83, 220.00], 'pad_amp': 0.18, 'lfo': 0.05, 'lfo_depth': 0.22,
        'scale': penta_cn(261.63), 'pattern': [0, 2, 4, 5, 4, 2, 6, 4, 2, 0, 3, 2], 'step': 1.0,
        'pluck_amp': 0.17, 'pluck_decay': 2.0, 'bright': 1.3,
    }))
    add('builtin-c-pipa.wav', lambda: _render({
        'pad': [110.00, 164.81], 'pad_amp': 0.15, 'lfo': 0.06, 'lfo_depth': 0.2,
        'scale': penta_cn(220.00), 'pattern': [0, 1, 2, 4, 3, 2, 0, 2, 4, 5, 4, 2], 'step': 0.75,
        'pluck_amp': 0.16, 'pluck_decay': 2.6, 'bright': 1.45,
    }))
    add('builtin-c-dizi.wav', lambda: _render({
        'pad': [130.81, 196.00, 293.66], 'pad_amp': 0.18, 'lfo': 0.055, 'lfo_depth': 0.26,
        'scale': penta_cn(293.66), 'pattern': [0, 2, 4, 2, 6, 4, 5, 4, 2, 0, 2, 4], 'step': 1.1,
        'pluck_amp': 0.15, 'pluck_decay': 1.5, 'bright': 1.15, 'pluck_dur': 1.9,
        'bell': [(4.4, 1174.66)], 'bell_amp': 0.035,
    }))
    add('builtin-c-erhu.wav', lambda: _render({
        'bass': [(87.31, 0.10)],
        'pad': [174.61, 261.63, 349.23], 'pad_amp': 0.22, 'lfo': 0.045, 'lfo_depth': 0.32,
        'scale': penta_cn(261.63), 'pattern': [0, 2, 4, 3, 2, 0, 4, 2], 'step': 1.6,
        'pluck_amp': 0.16, 'pluck_decay': 1.3, 'bright': 0.75, 'pluck_dur': 2.4,
    }))
    add('builtin-c-festive.wav', lambda: _render({
        'bass': [(98.00, 0.13)],
        'pad': [196.00, 246.94, 293.66], 'pad_amp': 0.24, 'lfo': 0.09, 'lfo_depth': 0.3,
        'scale': penta_cn(293.66), 'pattern': [0, 2, 4, 5, 6, 5, 4, 2], 'step': 0.9,
        'pluck_amp': 0.19, 'pluck_decay': 2.1, 'bright': 1.35,
        'bell': [(1.2, 1174.66), (3.6, 1318.5), (6.0, 1174.66), (8.4, 1567.98)], 'bell_amp': 0.05,
    }))
    add('builtin-c-neo.wav', lambda: _render({
        'pad': [130.81, 196.00, 329.63], 'pad_amp': 0.22, 'lfo': 0.055, 'lfo_depth': 0.3,
        'pad2': [261.63, 392.00], 'pad2_amp': 0.11, 'lfo2': 0.04,
        'scale': penta_cn(261.63), 'pattern': [0, 4, 2, 5, 4, 0, 2, 4], 'step': 1.4,
        'pluck_amp': 0.14, 'pluck_decay': 1.8, 'bright': 1.1,
        'bell': [(5.2, 1046.5)], 'bell_amp': 0.04,
    }))

    # --- 生日 5 ---
    add('builtin-b-piano.wav', lambda: _render({
        'pad': [261.63, 329.63, 392.00], 'pad_amp': 0.22, 'lfo': 0.08, 'lfo_depth': 0.3,
        'scale': major(261.63), 'pattern': [0, 2, 4, 7, 4, 2, 0, 4], 'step': 1.0,
        'pluck_amp': 0.16, 'pluck_decay': 2.0, 'bright': 1.2,
        'bell': [(2.0, 1046.5), (6.5, 1174.66)], 'bell_amp': 0.05,
    }))
    add('builtin-b-joy.wav', lambda: _render({
        'pad': [220.00, 277.18, 329.63], 'pad_amp': 0.20, 'lfo': 0.11, 'lfo_depth': 0.32,
        'scale': major(220.00), 'pattern': [0, 2, 4, 2, 6, 4, 2, 0], 'step': 0.8,
        'pluck_amp': 0.17, 'pluck_decay': 2.2, 'bright': 1.3,
    }))
    add('builtin-b-lively.wav', lambda: _render({
        'bass': [(110.00, 0.12)],
        'pad': [246.94, 311.13, 369.99], 'pad_amp': 0.18, 'lfo': 0.13, 'lfo_depth': 0.36,
        'scale': major(246.94), 'pattern': [0, 1, 2, 3, 4, 3, 2, 1], 'step': 0.6,
        'pluck_amp': 0.18, 'pluck_decay': 2.4, 'bright': 1.4,
        'bell': [(1.0, 1318.5), (3.0, 1567.98), (5.0, 1318.5), (7.0, 1760.0)], 'bell_amp': 0.045,
    }))
    add('builtin-b-guitar.wav', lambda: _render({
        'pad': [196.00, 246.94, 293.66], 'pad_amp': 0.17, 'lfo': 0.09, 'lfo_depth': 0.26,
        'scale': major(196.00), 'pattern': [0, 2, 4, 5, 4, 2, 0, 2], 'step': 0.9,
        'pluck_amp': 0.18, 'pluck_decay': 2.3, 'bright': 1.25,
    }))
    add('builtin-b-strings.wav', lambda: _render({
        'pad': [220.00, 261.63, 329.63], 'pad_amp': 0.26, 'lfo': 0.06, 'lfo_depth': 0.32,
        'pad2': [329.63, 392.00], 'pad2_amp': 0.11,
        'scale': major(220.00), 'pattern': [0, 4, 2, 5, 4, 2, 0, 4], 'step': 1.6,
        'pluck_amp': 0.11, 'pluck_decay': 1.4, 'bright': 0.8,
    }))

    # --- 寿宴 4 ---
    add('builtin-e-warm.wav', lambda: _render({
        'bass': [(87.31, 0.12)],
        'pad': [174.61, 220.00, 261.63], 'pad_amp': 0.26, 'lfo': 0.04, 'lfo_depth': 0.28,
        'scale': major(174.61), 'pattern': [0, 2, 4, 2, 0, 4, 2, 0], 'step': 2.0,
        'pluck_amp': 0.13, 'pluck_decay': 1.3, 'bright': 0.85, 'pluck_dur': 2.2,
    }))
    add('builtin-e-trad.wav', lambda: _render({
        'bass': [(98.00, 0.12)],
        'pad': [146.83, 220.00], 'pad_amp': 0.20, 'lfo': 0.05, 'lfo_depth': 0.24,
        'scale': penta_cn(246.94), 'pattern': [0, 2, 4, 5, 4, 2, 0, 4], 'step': 1.5,
        'pluck_amp': 0.16, 'pluck_decay': 1.8, 'bright': 1.15,
    }))
    add('builtin-e-classic.wav', lambda: _render({
        'pad': [130.81, 196.00, 246.94, 329.63], 'pad_amp': 0.26, 'lfo': 0.038, 'lfo_depth': 0.28,
        'scale': major(196.00), 'pattern': [0, 4, 2, 6, 4, 2, 0, 2], 'step': 2.2,
        'pluck_amp': 0.12, 'pluck_decay': 1.2, 'bright': 0.9, 'pluck_dur': 2.4,
    }))
    add('builtin-e-bless.wav', lambda: _render({
        'pad': [196.00, 246.94, 293.66, 369.99], 'pad_amp': 0.24, 'lfo': 0.05, 'lfo_depth': 0.3,
        'pad2': [293.66, 369.99], 'pad2_amp': 0.11,
        'scale': major(246.94), 'pattern': [0, 2, 4, 4, 2, 0, 4, 2], 'step': 1.7,
        'pluck_amp': 0.13, 'pluck_decay': 1.5, 'bright': 0.95,
        'bell': [(4.0, 1046.5), (8.5, 987.77)], 'bell_amp': 0.04,
    }))

    # --- 满月 3 ---
    add('builtin-y-lullaby.wav', lambda: _render({
        'pad': [261.63, 329.63, 392.00], 'pad_amp': 0.22, 'lfo': 0.035, 'lfo_depth': 0.34,
        'scale': major(261.63), 'pattern': [0, 2, 4, 2, 0, 2, 4, 5], 'step': 2.4,
        'pluck_amp': 0.12, 'pluck_decay': 1.2, 'bright': 0.75, 'pluck_dur': 2.6,
    }))
    add('builtin-y-piano.wav', lambda: _render({
        'pad': [220.00, 261.63, 329.63], 'pad_amp': 0.20, 'lfo': 0.06, 'lfo_depth': 0.3,
        'scale': major(261.63), 'pattern': [0, 4, 2, 0, 4, 2, 0, 2], 'step': 1.8,
        'pluck_amp': 0.15, 'pluck_decay': 1.8, 'bright': 1.1,
    }))
    add('builtin-y-heal.wav', lambda: _render({
        'pad': [293.66, 349.23, 440.00], 'pad_amp': 0.20, 'lfo': 0.05, 'lfo_depth': 0.36,
        'pad2': [440.00, 523.25], 'pad2_amp': 0.09, 'lfo2': 0.035,
        'scale': major(293.66), 'pattern': [0, 2, 4, 6, 4, 2, 0, 4], 'step': 2.0,
        'pluck_amp': 0.11, 'pluck_decay': 1.4, 'bright': 0.9,
        'bell': [(3.0, 1318.5)], 'bell_amp': 0.035,
    }))

    # --- 升学 4 ---
    add('builtin-g-youth.wav', lambda: _render({
        'bass': [(110.00, 0.11)],
        'pad': [220.00, 277.18, 329.63], 'pad_amp': 0.22, 'lfo': 0.10, 'lfo_depth': 0.32,
        'scale': major(220.00), 'pattern': [0, 2, 4, 5, 4, 2, 0, 4], 'step': 0.9,
        'pluck_amp': 0.17, 'pluck_decay': 2.0, 'bright': 1.25,
    }))
    add('builtin-g-hope.wav', lambda: _render({
        'pad': [246.94, 311.13, 369.99], 'pad_amp': 0.22, 'lfo': 0.07, 'lfo_depth': 0.32,
        'pad2': [369.99, 466.16], 'pad2_amp': 0.10,
        'scale': major(246.94), 'pattern': [0, 4, 2, 6, 4, 2, 0, 4], 'step': 1.3,
        'pluck_amp': 0.14, 'pluck_decay': 1.7, 'bright': 1.1,
        'bell': [(2.5, 1174.66), (7.0, 1318.5)], 'bell_amp': 0.045,
    }))
    add('builtin-g-bright.wav', lambda: _render({
        'pad': [261.63, 329.63, 392.00], 'pad_amp': 0.20, 'lfo': 0.12, 'lfo_depth': 0.34,
        'scale': major(329.63), 'pattern': [0, 1, 2, 4, 2, 1, 0, 2], 'step': 0.7,
        'pluck_amp': 0.17, 'pluck_decay': 2.2, 'bright': 1.35,
        'bell': [(1.5, 1567.98), (4.5, 1760.0), (7.5, 1567.98)], 'bell_amp': 0.05,
    }))
    add('builtin-g-solemn.wav', lambda: _render({
        'bass': [(87.31, 0.13), (130.81, 0.07)],
        'pad': [174.61, 220.00, 261.63], 'pad_amp': 0.26, 'lfo': 0.038, 'lfo_depth': 0.26,
        'scale': major(174.61), 'pattern': [0, 0, 4, 2, 0, 4, 2, 0], 'step': 2.4,
        'pluck_amp': 0.13, 'pluck_decay': 1.1, 'bright': 0.85, 'pluck_dur': 2.4,
    }))

    # --- 商务 4 ---
    add('builtin-z-premium.wav', lambda: _render({
        'bass': [(65.41, 0.13), (98.00, 0.08)],
        'pad': [130.81, 196.00, 246.94], 'pad_amp': 0.26, 'lfo': 0.032, 'lfo_depth': 0.24,
        'scale': minor(196.00), 'pattern': [0, 2, 4, 2, 0, 4, 2, 4], 'step': 2.2,
        'pluck_amp': 0.12, 'pluck_decay': 1.2, 'bright': 0.8, 'pluck_dur': 2.4,
    }))
    add('builtin-z-jazz.wav', lambda: _render({
        'pad': [116.54, 174.61, 220.00, 261.63], 'pad_amp': 0.22, 'lfo': 0.045, 'lfo_depth': 0.3,
        'scale': minor(220.00), 'pattern': [0, 3, 2, 5, 4, 2, 0, 3], 'step': 1.2,
        'pluck_amp': 0.15, 'pluck_decay': 1.9, 'bright': 1.1,
        'bell': [(3.4, 880.0), (6.8, 987.77)], 'bell_amp': 0.04,
    }))
    add('builtin-z-electronic.wav', lambda: _render({
        'bass': [(55.00, 0.15), (82.41, 0.08)],
        'pad': [164.81, 220.00, 261.63], 'pad_amp': 0.22, 'lfo': 0.14, 'lfo_depth': 0.38,
        'pad2': [329.63, 415.30], 'pad2_amp': 0.10, 'lfo2': 0.10,
        'scale': minor(220.00), 'pattern': [0, 2, 4, 2, 6, 4, 2, 0], 'step': 0.8,
        'pluck_amp': 0.14, 'pluck_decay': 2.4, 'bright': 1.4,
    }))
    add('builtin-z-strings.wav', lambda: _render({
        'bass': [(73.42, 0.12)],
        'pad': [146.83, 220.00, 277.18], 'pad_amp': 0.28, 'lfo': 0.036, 'lfo_depth': 0.28,
        'pad2': [277.18, 349.23], 'pad2_amp': 0.12,
        'scale': minor(220.00), 'pattern': [0, 4, 2, 6, 4, 2, 0, 4], 'step': 2.0,
        'pluck_amp': 0.11, 'pluck_decay': 1.2, 'bright': 0.85, 'pluck_dur': 2.6,
    }))

    # --- 节日 5 ---
    add('builtin-f-newyear.wav', lambda: _render({
        'bass': [(98.00, 0.13)],
        'pad': [196.00, 246.94, 293.66], 'pad_amp': 0.24, 'lfo': 0.10, 'lfo_depth': 0.32,
        'scale': penta_cn(293.66), 'pattern': [0, 2, 4, 5, 6, 5, 4, 2], 'step': 0.85,
        'pluck_amp': 0.19, 'pluck_decay': 2.1, 'bright': 1.4,
        'bell': [(0.8, 1174.66), (2.8, 1567.98), (4.8, 1318.5), (6.8, 1760.0), (8.8, 1174.66)], 'bell_amp': 0.055,
    }))
    add('builtin-f-christmas.wav', lambda: _render({
        'pad': [220.00, 261.63, 329.63], 'pad_amp': 0.22, 'lfo': 0.07, 'lfo_depth': 0.3,
        'scale': major(220.00), 'pattern': [0, 2, 4, 5, 4, 2, 0, 4], 'step': 1.1,
        'pluck_amp': 0.15, 'pluck_decay': 2.0, 'bright': 1.2,
        'bell': [(1.2, 1318.5), (3.6, 1567.98), (6.0, 1760.0), (8.4, 1567.98)], 'bell_amp': 0.06,
    }))
    add('builtin-f-celebrate.wav', lambda: _render({
        'bass': [(110.00, 0.12)],
        'pad': [220.00, 277.18, 329.63], 'pad_amp': 0.22, 'lfo': 0.11, 'lfo_depth': 0.34,
        'scale': major(220.00), 'pattern': [0, 2, 4, 6, 4, 2, 4, 0], 'step': 0.8,
        'pluck_amp': 0.18, 'pluck_decay': 2.2, 'bright': 1.3,
        'bell': [(2.0, 1318.5), (5.0, 1760.0), (8.0, 1567.98)], 'bell_amp': 0.05,
    }))
    add('builtin-f-family.wav', lambda: _render({
        'pad': [196.00, 246.94, 293.66], 'pad_amp': 0.24, 'lfo': 0.06, 'lfo_depth': 0.3,
        'pad2': [293.66, 369.99], 'pad2_amp': 0.11,
        'scale': major(196.00), 'pattern': [0, 2, 4, 2, 0, 4, 2, 4], 'step': 1.5,
        'pluck_amp': 0.14, 'pluck_decay': 1.7, 'bright': 1.0,
    }))
    add('builtin-f-house.wav', lambda: _render({
        'pad': [174.61, 220.00, 261.63], 'pad_amp': 0.24, 'lfo': 0.055, 'lfo_depth': 0.28,
        'scale': major(220.00), 'pattern': [0, 4, 2, 0, 4, 2, 0, 2], 'step': 1.6,
        'pluck_amp': 0.15, 'pluck_decay': 1.6, 'bright': 1.05,
        'bell': [(3.2, 1046.5)], 'bell_amp': 0.04,
    }))
    return R


def main():
    os.makedirs(OUT, exist_ok=True)
    # 旧 4 首
    old = {
        'builtin-romantic.wav': (gen_romantic, SR_OLD),
        'builtin-chinese.wav': (gen_chinese, SR_OLD),
        'builtin-lazy.wav': (gen_lazy, SR_OLD),
        'builtin-dream.wav': (gen_dream, SR_OLD),
    }
    for name, (fn, sr) in old.items():
        path = os.path.join(OUT, name)
        if os.path.exists(path):
            print('SKIP', name)
            continue
        _write_wav(path, fn(), sr)
        print('OK', name, os.path.getsize(path))
    # 新曲
    for name, fn in recipes():
        path = os.path.join(OUT, name)
        if os.path.exists(path):
            print('SKIP', name)
            continue
        _write_wav(path, fn(), _SR)
        print('OK', name, os.path.getsize(path))
    print('DONE', len(os.listdir(OUT)), 'files')


if __name__ == '__main__':
    main()
