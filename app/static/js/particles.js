(() => {
    const canvas = document.querySelector(".particle-background");
    if (!canvas) {
        return;
    }

    const context = canvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let particles = [];
    let animationFrame;

    const resize = () => {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * pixelRatio;
        canvas.height = window.innerHeight * pixelRatio;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const particleCount = Math.min(95, Math.max(36, Math.floor(window.innerWidth / 14)));
        particles = Array.from({ length: particleCount }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 1.5 + 0.5,
            speedX: (Math.random() - 0.5) * 0.18,
            speedY: (Math.random() - 0.5) * 0.18,
            hue: Math.random() > 0.78 ? 190 : 0,
        }));
    };

    const draw = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        context.clearRect(0, 0, width, height);

        particles.forEach((particle) => {
            if (!reducedMotion) {
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                if (particle.x < -10 || particle.x > width + 10) particle.speedX *= -1;
                if (particle.y < -10 || particle.y > height + 10) particle.speedY *= -1;
            }

            context.beginPath();
            context.fillStyle = particle.hue ? "rgba(93, 211, 255, 0.7)" : "rgba(220, 230, 240, 0.55)";
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fill();
        });

        for (let first = 0; first < particles.length; first += 1) {
            for (let second = first + 1; second < particles.length; second += 1) {
                const deltaX = particles[first].x - particles[second].x;
                const deltaY = particles[first].y - particles[second].y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (distance > 115) continue;

                context.beginPath();
                context.strokeStyle = `rgba(110, 190, 220, ${0.12 * (1 - distance / 115)})`;
                context.lineWidth = 0.6;
                context.moveTo(particles[first].x, particles[first].y);
                context.lineTo(particles[second].x, particles[second].y);
                context.stroke();
            }
        }

        if (!reducedMotion) {
            animationFrame = window.requestAnimationFrame(draw);
        }
    };

    window.addEventListener("resize", resize, { passive: true });
    resize();
    draw();

    window.addEventListener("pagehide", () => {
        window.cancelAnimationFrame(animationFrame);
    }, { once: true });
})();
