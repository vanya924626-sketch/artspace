document.addEventListener("dragstart", e => {
  e.dataTransfer.setData("text", e.target.innerText);
});

document.addEventListener("dragover", e => e.preventDefault());