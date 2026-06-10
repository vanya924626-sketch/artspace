async function load() {
  const res = await fetch("/api/schedule");
  const data = await res.json();

  document.getElementById("list").innerHTML =
    data.map(x =>
      `<div>
        <b>${x.title}</b> - ${x.teacherName}
        (Hall ${x.hallId}) ${x.dayOfWeek} ${x.timeStart}
      </div>`
    ).join("");
}

load();