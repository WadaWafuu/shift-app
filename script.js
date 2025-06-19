// シフトデータ配列（各シフトは日付付き）
let shifts = [];

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

  // 表と合計を更新
  updateTable();
  updateTotal();

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
}

// シフト一覧をテーブルに表示
function updateTable() {
  const tbody = document.querySelector("#shiftTable tbody");
  tbody.innerHTML = "";

  shifts.forEach((shift, index) => {
    const row = document.createElement("tr");

    const totalHour = Math.floor(shift.totalMin / 60);
    const totalRemainMin = shift.totalMin % 60;
    const nightHour = Math.floor(shift.nightMin / 60);
    const nightRemainMin = shift.nightMin % 60;

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${shift.date}</td>
      <td>${shift.start}</td>
      <td>${shift.end}</td>
      <td>${totalHour}</td>
      <td>${totalRemainMin}</td>
      <td>${nightHour}</td>
      <td>${nightRemainMin}</td>
      <td><button onclick="deleteShift(${index})">削除</button></td>
    `;

    tbody.appendChild(row);
  });
}

/*
// 入力フォームの値をリセットする関数
function resetInputs() {
  document.getElementById('shiftDate').value = '';
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
}
*/

// 合計計算と出勤日数表示
function updateTotal() {
  let total = 0;
  let night = 0;

  // 合計時間を集計
  shifts.forEach(shift => {
    total += shift.totalMin;
    night += shift.nightMin;
  });

  const totalHour = Math.floor(total / 60);
  const totalMin = total % 60;
  const nightHour = Math.floor(night / 60);
  const nightMin = night % 60;

  document.getElementById("totalHour").innerText = `全体の時間：${totalHour}`;
  document.getElementById("totalMin").innerText = `全体の分数：${totalMin}`;
  document.getElementById("totalNightHour").innerText = `17時以降の時間：${nightHour}`;
  document.getElementById("totalNightMin").innerText = `17時以降の分数：${nightMin}`;

  // 出勤日数を日付の重複なしで数える
  const uniqueDates = new Set(shifts.map(shift => shift.date));
  const count = uniqueDates.size;

  const dailyUl = document.getElementById("dailyTotals");
  dailyUl.innerHTML = `<li>出勤日数：${count}日</li>`;
}

console.log("✅ script.js 読み込まれたよ！");
