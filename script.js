// シフトデータ配列（各シフトは日付付き）
let shifts = [];

// 分数を10分単位で切り捨てる関数
function floorTo10Minutes(minutes) {
  return Math.floor(minutes / 10) * 10;
}

// 時:分文字列 → 10分単位で切り捨て → 時:分文字列に戻す
function formatRoundedTime(timeStr) {
  const [hour, minute] = timeStr.split(":").map(Number);
  const totalMin = hour * 60 + minute;
  const roundedMin = floorTo10Minutes(totalMin);
  const newHour = Math.floor(roundedMin / 60);
  const newMin = roundedMin % 60;
  return `${String(newHour).padStart(2, "0")}:${String(newMin).padStart(2, "0")}`;
}

// シフト追加処理
function addShift() {
  const dateInput = document.getElementById("shiftDate");
  const startInput = document.getElementById("startTime");
  const endInput = document.getElementById("endTime");

  const date = dateInput.value;
  const start = startInput.value;
  const end = endInput.value;

  // 入力が全部そろっていないときは何もしない
  if (!date || !start || !end) return;

  // 文字列の"時:分"を数値に変換
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  // 開始から終了までの分数（0時超えにも対応）
  let totalMin = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMin < 0) totalMin += 24 * 60;

  // 17時（1020分）以降の分数を計算
  const nightStartMin = 17 * 60;
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  let nightMin = 0;
  if (endMin > nightStartMin) {
    const nightStart = Math.max(startMin, nightStartMin);
    nightMin = endMin - nightStart;
  }

  // シフトを保存
  shifts.push({
    date,
    start,
    end,
    totalMin,
    nightMin
  });

  updateTable();
  updateTotal();
  saveToLocalStorage(); // ←保存！
  
  // 入力欄リセット
  dateInput.value = "";
  startInput.value = "";
  endInput.value = "";
}

// 削除処理
function deleteShift(index) {
  shifts.splice(index, 1);
  updateTable();
  updateTotal();
  saveToLocalStorage(); // ←保存！
}

// 表示を更新（テーブル部分）
function updateTable() {
  const tbody = document.querySelector("#shiftTable tbody");
  tbody.innerHTML = "";

  shifts.forEach((shift, index) => {
    const row = document.createElement("tr");

    // 時間・分数を10分単位で丸めて表示
    const totalRounded = floorTo10Minutes(shift.totalMin);
    const totalHour = Math.floor(totalRounded / 60);
    const totalRemainMin = totalRounded % 60;

    const nightRounded = floorTo10Minutes(shift.nightMin);
    const nightHour = Math.floor(nightRounded / 60);
    const nightRemainMin = nightRounded % 60;

    const displayStart = formatRoundedTime(shift.start);
    const displayEnd = formatRoundedTime(shift.end);

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${shift.date}</td>
      <td>${displayStart}</td>
      <td>${displayEnd}</td>
      <td>${totalHour}</td>
      <td>${totalRemainMin}</td>
      <td>${nightHour}</td>
      <td>${nightRemainMin}</td>
      <td><button onclick="deleteShift(${index})">削除</button></td>
    `;

    tbody.appendChild(row);
  });
}

// 合計表示を更新
function updateTotal() {
  let total = 0;
  let night = 0;

  shifts.forEach(shift => {
    total += shift.totalMin;
    night += shift.nightMin;
  });

  const totalRounded = floorTo10Minutes(total);
  const totalHour = Math.floor(totalRounded / 60);
  const totalMin = totalRounded % 60;

  const nightRounded = floorTo10Minutes(night);
  const nightHour = Math.floor(nightRounded / 60);
  const nightMin = nightRounded % 60;

  document.getElementById("totalHour").innerText = `全体の時間：${totalHour}`;
  document.getElementById("totalMin").innerText = `全体の分数：${totalMin}`;
  document.getElementById("totalNightHour").innerText = `17時以降の時間：${nightHour}`;
  document.getElementById("totalNightMin").innerText = `17時以降の分数：${nightMin}`;

  // 出勤日数の表示
  const uniqueDates = new Set(shifts.map(shift => shift.date));
  const count = uniqueDates.size;
  const dailyUl = document.getElementById("dailyTotals");
  dailyUl.innerHTML = `<li>出勤日数：${count}日</li>`;
}

// LocalStorageに保存
function saveToLocalStorage() {
  localStorage.setItem("shifts", JSON.stringify(shifts));
}

// LocalStorageから読み込み
function loadFromLocalStorage() {
  const data = localStorage.getItem("shifts");
  if (data) {
    shifts = JSON.parse(data);
    updateTable();
    updateTotal();
  }
}

// データ初期化（全削除）
function clearLocalData() {
  localStorage.removeItem("shifts");
  shifts = [];
  updateTable();
  updateTotal();
}

// ページ読み込み時に保存データを読み込む
window.onload = function () {
  loadFromLocalStorage();
};

console.log("✅ script.js 読み込まれたよ！");
