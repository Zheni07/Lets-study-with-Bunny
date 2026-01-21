const bunny = document.getElementById('bunny');
const audio = document.getElementById('bunny-audio');

bunny.addEventListener('click', () => {
    audio.currentTime = 0;
    audio.play();

    const messages = [
        "Здравей! Аз съм Бъни и тук ще се учим заедно!",
        "Готов ли си за ново приключение с игрите?",
        "Усмивката е важна, докато учим!"
    ];

    const randomIndex = Math.floor(Math.random() * messages.length);
    bunnyText.querySelector("p").textContent = messages[randomIndex];
});
