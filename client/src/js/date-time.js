const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit'
});

export function startDateTime() {
  const greeting = document.getElementById('greeting');
  const dateTime = document.getElementById('currentDateTime');
  if (!greeting || !dateTime) return;

  const update = () => {
    const now = new Date();
    const hour = now.getHours();
    greeting.textContent = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    dateTime.textContent = `${dateFormatter.format(now)} · ${timeFormatter.format(now)}`;
  };

  update();
  setInterval(update, 1000);
}
