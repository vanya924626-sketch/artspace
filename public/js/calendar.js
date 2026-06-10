async function load() {
  const res = await fetch("/api/class");
  const data = await res.json();

  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  document.getElementById("calendar").innerHTML =
    days.map(day => {
      const events = data.filter(e => e.day === day);

      return `
        <div class="day">
          <b>${day}</b>
          ${events.map(e => `
            <div class="event">
              ${e.title}<br>
              ${e.teacherName}<br>
              ${e.start} - ${e.end}
            </div>
          `).join("")}
        </div>
      `;
    }).join("");
}

load();