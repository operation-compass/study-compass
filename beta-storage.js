function betaStorage(key, defaults, valid) {
  let blocked = false;
  let state = defaults;
  const notice = text => {
    const el = document.getElementById('storageNotice');
    if (el) el.textContent = text;
  };
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (!valid(parsed)) throw new Error('Invalid saved state');
      state = parsed;
    }
  } catch {
    blocked = true;
    notice('保存済みの記録を読み込めません。元の記録は上書きせず、この画面では学習を続けられます。今回の記録は画面を閉じると失われます。');
  }
  return {
    state,
    save(value) {
      if (blocked) return false;
      try {
        localStorage.setItem(key, JSON.stringify(value));
        notice('');
        return true;
      } catch {
        notice('記録を保存できません。この画面では学習を続けられますが、今回の記録は画面を閉じると失われます。');
        return false;
      }
    }
  };
}
