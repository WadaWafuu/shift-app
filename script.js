// ==============================
//  シフト集計（スマホ対応完全版）
// ==============================

// LocalStorageからデータを復元
let shifts = JSON.parse(localStorage.getItem("shifts") || "[]");

// ------------------------------
//  10分刻み（切り捨て）処理
// ------------------------------
function roundDownTo10(minute) {
  return Math.floor(minute / 10) * 10;
}

// ------------------------------
//  分数を hh:mm 形式に変換
// ------------------------------
function toHM(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ------------------------------
//  DOM準備完了時の処理
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // 入力stepを10分単位に保険設定
  const st = document.getElementById("startTime");
  const et = document.getElementById("endTime");
  if (st) st.step = 600;
  if (et) et.step = 600;

  // インフルと月水チェック排他設定
  const flu = document.getElementById("fluCheck");
  const mw = document.getElementById("mwCheck");
  if (flu && mw) {
    flu.addEventListener("change", () => {
      if (flu.checked) mw.checked = false;
    });
    mw.addEventListener("change", () => {
      if (mw.checked) flu.checked = false;
    });
  }

  // 復元表示
  updateTable();
  updateSummary();
});

// ------------------------------
//  シフト追加
// ------------------------------
function addShift() {
  const date = document.getElementById("shiftDate").value;
  const startStr = document.getElementById("startTime").value;
  const endStr = document.getElementById("endTime").value;
  const type = document.getElementById("workType").value;
  const mw = document.getElementById("mwCheck").checked;
  const flu = document.getElementById("fluCheck").checked;

  if (!date || !startStr || !endStr || !type) {
    alert("日付・勤務区分・開始/終了をすべて入力してください。");
    return;
  }

  // 開始・終了を数値化
  let [sH, sM] = startStr.split(":").map(Number);
  let [eH, eM] = endStr.split(":").map(Number);

  // 10分刻み丸め
  sM = roundDownTo10(sM);
  eM = roundDownTo10(eM);

  let startMin = sH * 60 + sM;
  let endMin = eH * 60 + eM;

  // --------------------------
  //  勤務区分別の制約
  // --------------------------
  if (type === "am") {
    const minStart = 8 * 60 + 10; // 8:10以降
    startMin = Math.max(startMin, minStart);
  } else if (type === "pm") {
    // 午後勤務（14:50 or 月水14:40 or インフル14:20）
    let minStart = 14 * 60 + 50; // 通常14:50
    if (flu) {
      minStart = 14 * 60 + 20; // インフル14:20（最優先）
    } else if (mw) {
      minStart = 14 * 60 + 40; // 月水14:40
    }
    startMin = Math.max(startMin, minStart);
  } else if (type === "乳健") {
    // 乳健：13:10〜15:00まで（範囲内制限）
    const nyuMin = 13 * 60 + 10; // 13:10
    const nyuMax = 15 * 60; // 15:00
    startMin = Math.max(startMin, nyuMin);
    endMin = Math.min(endMin, nyuMax);
  }

  // 終了が開始より前はエラー
  if (endMin <= startMin) {
    alert("終了時刻は開始より後にしてください。");
    return;
  }

  // 合計と17時以降の時間を算出
  const totalMin = endMin - startMin;
  const nightStart = 17 * 60;
  const nightMin =
    endMin > nightStart ? endMin - Math.max(startMin, nightStart) : 0;

  // データ保存
  shifts.push({
    date,
    type,
    start: toHM(startMin),
    end: toHM(endMin),
    totalMin,
    nightMin,
  });
  localStorage.setItem("shifts", JSON.stringify(shifts));

  updateTable();
  updateSummary();

  // 入力リセット
  document.getElementById("shiftDate").value = "";
  document.getElementById("workType").value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
  document.getElementById("mwCheck").checked = false;
  document.getElementById("fluCheck").checked = false;
}

// ------------------------------
//  個別削除・一括削除
// ------------------------------
function deleteShift(idx) {
  shifts.splice(idx, 1);
  localStorage.setItem("shifts", JSON.stringify(shifts));
  updateTable();
  updateSummary();
}

function clearAll() {
  if (!confirm("すべてのシフトデータを削除してリセットしますか？")) return;
  shifts = [];
  localStorage.removeItem("shifts");
  updateTable();
  updateSummary();
  // 入力欄もリセット
  document.getElementById("shiftDate").value = "";
  document.getElementById("workType").value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
  document.getElementById("mwCheck").checked = false;
  document.getElementById("fluCheck").checked = false;
}

// ------------------------------
//  テーブル更新
// ------------------------------
function updateTable() {
  const tbody = document.querySelector("#shiftTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  shifts.forEach((s, i) => {
    const totalH = Math.floor(s.totalMin / 60);
    const totalR = s.totalMin % 60;
    const nightH = Math.floor(s.nightMin / 60);
    const nightR = s.nightMin % 60;

    const tr = document.createElement("tr");
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
//  集計更新
// ------------------------------
function updateSummary() {
  const box = document.getElementById("summary");
  if (!box) return;

  if (shifts.length === 0) {
    box.innerHTML = "<p>データがありません。</p>";
    return;
  }

  const dayNum = (s) => Number(s.date.split("-")[2]);
  const firstHalf = shifts.filter((s) => dayNum(s) <= 16);
  const secondHalf = shifts.filter((s) => dayNum(s) >= 17);

  const sum = (arr) => arr.reduce((a, s) => a + s.totalMin, 0);
  const sumNight = (arr) => arr.reduce((a, s) => a + s.nightMin, 0);
  const sumType = (arr, t) => sum(arr.filter((s) => s.type === t));

  const toTxt = (m) => `${Math.floor(m / 60)}時間${m % 60}分`;

  const fhDays = new Set(firstHalf.map((s) => s.date)).size;
  const shDays = new Set(secondHalf.map((s) => s.date)).size;
  const allDays = new Set(shifts.map((s) => s.date)).size;

  const fhTotal = sum(firstHalf);
  const shTotal = sum(secondHalf);
  const allTotal = sum(shifts);

  const fhNight = sumNight(firstHalf);
  const shNight = sumNight(secondHalf);
  const allNight = sumNight(shifts);

  const fhAM = sumType(firstHalf, "am");
  const fhPM = sumType(firstHalf, "pm");
  const fhNY = sumType(firstHalf, "乳健");

  const shAM = sumType(secondHalf, "am");
  const shPM = sumType(secondHalf, "pm");
  const shNY = sumType(secondHalf, "乳健");

  box.innerHTML = `
    <h3>出勤日数</h3>
    <p>前半(1～16日)：${fhDays}日</p>
    <p>後半(17～31日)：${shDays}日</p>
    <p>合計：${allDays}日</p>

    <h3>時間合計</h3>
    <p>前半：${toTxt(fhTotal)}</p>
    <p>後半：${toTxt(shTotal)}</p>
    <p>全体：${toTxt(allTotal)}</p>

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

// ------------------------------
//  起動時（再保険）
// ------------------------------
window.onload = () => {
  updateTable();
  updateSummary();
};
