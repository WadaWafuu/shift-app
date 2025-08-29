// ==============================
//  シフト集計（script.js）
// ==============================

// 保存データ
let shifts = JSON.parse(localStorage.getItem("shifts") || "[]");

// 10分刻み（切り捨て）に丸める
function roundDownTo10(minute0to59) {
  return Math.floor(minute0to59 / 10) * 10;
}

// mm(分) → "hh:mm"
function toHM(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// DOM 準備
document.addEventListener("DOMContentLoaded", () => {
  // 時刻入力のステップを10分に（保険）
  const st = document.getElementById("startTime");
  const et = document.getElementById("endTime");
  if (st) st.step = 600;
  if (et) et.step = 600;

  // インフル / 月水 の排他
  const flu = document.getElementById("fluCheck");
  const mw  = document.getElementById("mwCheck");
  if (flu && mw) {
    flu.addEventListener("change", () => { if (flu.checked) mw.checked = false; });
    mw.addEventListener("change",  () => { if (mw.checked)  flu.checked = false; });
  }

  // 復元表示
  updateTable();
  updateSummary();
});

// ------------------------------
//  追加
// ------------------------------
function addShift() {
  const date = document.getElementById("shiftDate").value;
  const startStr = document.getElementById("startTime").value;
  const endStr   = document.getElementById("endTime").value;
  const type     = document.getElementById("workType").value; // "am" | "pm" | "乳健"
  const mw       = document.getElementById("mwCheck").checked;
  const flu      = document.getElementById("fluCheck").checked;

  if (!date || !startStr || !endStr || !type) {
    alert("日付・勤務区分・開始/終了をすべて入力してください。");
    return;
  }

  // 入力 → 分に変換（まず10分刻みで丸め、あとで下限/上限に補正）
  let [sH, sM] = startStr.split(":").map(Number);
  let [eH, eM] = endStr.split(":").map(Number);

  sM = roundDownTo10(sM);
  eM = roundDownTo10(eM);

  let startMin = sH * 60 + sM;
  let endMin   = eH * 60 + eM;

  // --- 勤務区分別 ルール ---
  // 午前：開始は 8:10 以降
  // 午後（通常）：開始は 14:50 以降
  // 午後（月水）：開始は 14:40 以降
  // 午後（インフル）：開始は 14:20 以降（インフルが最優先）
  // 乳健：開始は 13:10 以降、終了は 最大 15:00 まで（範囲外入力は内側に寄せる）
  if (type === "am") {
    const minStart = 8 * 60 + 10; // 8:10
    startMin = Math.max(startMin, minStart);
  } else if (type === "pm") {
    let minStart = 14 * 60 + 50;  // 通常 14:50
    if (flu) {
      minStart = 14 * 60 + 20;    // インフル 14:20（最優先）
    } else if (mw) {
      minStart = 14 * 60 + 40;    // 月水 14:40
    }
    startMin = Math.max(startMin, minStart);
  } else if (type === "乳健") {
    const nyuMinStart = 13 * 60 + 10; // 13:10
    const nyuMaxEnd   = 15 * 60;      // 15:00
    startMin = Math.max(startMin, nyuMinStart);
    endMin   = Math.min(endMin, nyuMaxEnd);
  }

  // 妥当性
  if (endMin <= startMin) {
    alert("終了時刻は開始より後にしてください。");
    return;
  }

  // 合計・17時以降
  const totalMin = endMin - startMin;
  const nightStart = 17 * 60;
  const nightMin = endMin > nightStart ? endMin - Math.max(startMin, nightStart) : 0;

  // 保存（表示は補正後の hh:mm）
  shifts.push({
    date,
    type,
    start: toHM(startMin),
    end:   toHM(endMin),
    totalMin,
    nightMin
  });
  localStorage.setItem("shifts", JSON.stringify(shifts));

  updateTable();
  updateSummary();

  // 入力欄リセット
  document.getElementById("shiftDate").value = "";
  document.getElementById("workType").value  = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value   = "";
  document.getElementById("mwCheck").checked = false;
  document.getElementById("fluCheck").checked = false;
}

// ------------------------------
//  削除 / 一括削除
// ------------------------------
function deleteShift(idx) {
  shifts.splice(idx, 1);
  localStorage.setItem("shifts", JSON.stringify(shifts));
  updateTable();
  updateSummary();
}

function clearAll() {
  if (!confirm("すべてのシフトデータを削除し、入力もリセットしますか？")) return;
  shifts = [];
  localStorage.removeItem("shifts");
  updateTable();
  updateSummary();
  // 入力もリセット
  document.getElementById("shiftDate").value = "";
  document.getElementById("workType").value  = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value   = "";
  document.getElementById("mwCheck").checked = false;
  document.getElementById("fluCheck").checked = false;
}

// ------------------------------
//  テーブル表示
// ------------------------------
function updateTable() {
  const tbody = document.querySelector("#shiftTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  shifts.forEach((s, i) => {
    const tr = document.createElement("tr");
    const totalH = Math.floor(s.totalMin / 60);
    const totalR = s.totalMin % 60;
    const nightH = Math.floor(s.nightMin / 60);
    const nightR = s.nightMin % 60;

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.date}</td>
      <td>${s.type}</td>
      <td>${s.start}</td>
      <td>${s.end}</td>
      <td>${totalH}</td>
      <td>${totalR}</td>
      <td>${nightH}</td>
      <td>${nightR}</td>
      <td><button onclick="deleteShift(${i})">削除</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------
//  集計表示（前半/後半 × 区分 & 17時以降）
// ------------------------------
function updateSummary() {
  const box = document.getElementById("summary");
  if (!box) return;

  if (shifts.length === 0) {
    box.innerHTML = "<p>データがありません。</p>";
    return;
  }

  const dayNum = s => Number(s.date.split("-")[2]);

  const firstHalf = shifts.filter(s => dayNum(s) <= 16);
  const secondHalf = shifts.filter(s => dayNum(s) >= 17);

  const sum = arr => arr.reduce((a, s) => a + s.totalMin, 0);
  const sumNight = arr => arr.reduce((a, s) => a + s.nightMin, 0);
  const sumType = (arr, t) => sum(arr.filter(s => s.type === t));

  const toTxt = m => `${Math.floor(m / 60)}時間${m % 60}分`;

  const fhDays = new Set(firstHalf.map(s => s.date)).size;
  const shDays = new Set(secondHalf.map(s => s.date)).size;
  const allDays = new Set(shifts.map(s => s.date)).size;

  const fhTotal = sum(firstHalf);
  const shTotal = sum(secondHalf);
  const allTotal = sum(shifts);

  const fhNight = sumNight(firstHalf);
  const shNight = sumNight(secondHalf);
  const allNight = sumNight(shifts);

  const fhAM  = sumType(firstHalf, "am");
  const fhPM  = sumType(firstHalf, "pm");
  const fhNY  = sumType(firstHalf, "乳健");

  const shAM  = sumType(secondHalf, "am");
  const shPM  = sumType(secondHalf, "pm");
  const shNY  = sumType(secondHalf, "乳健");

  box.innerHTML = `
    <h3>出勤日数</h3>
    <p>前半(1～16日)：${fhDays}日</p>
    <p>後半(17～31日)：${shDays}日</p>
    <p>合計：${allDays}日</p>

    <h3>時間合計</h3>
    <p>前半 合計：${toTxt(fhTotal)}</p>
    <p>後半 合計：${toTxt(shTotal)}</p>
    <p>全体 合計：${toTxt(allTotal)}</p>

    <h3>17時以降</h3>
    <p>前半：${toTxt(fhNight)}</p>
    <p>後半：${toTxt(shNight)}</p>
    <p>全体：${toTxt(allNight)}</p>

    <h3>勤務区分ごとの合計（前半）</h3>
    <p>午前：${toTxt(fhAM)}</p>
    <p>午後：${toTxt(fhPM)}</p>
    <p>乳健：${toTxt(fhNY)}</p>

    <h3>勤務区分ごとの合計（後半）</h3>
    <p>午前：${toTxt(shAM)}</p>
    <p>午後：${toTxt(shPM)}</p>
    <p>乳健：${toTxt(shNY)}</p>
  `;
}

// 起動時復元（DOMContentLoadedでも呼ぶが、保険で）
window.onload = () => {
  updateTable();
  updateSummary();
};
