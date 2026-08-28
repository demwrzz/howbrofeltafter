// Yükleme Ekranı Geçişi
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }, 1800);
});

// Başvuru Formu Gönderimi
document.getElementById('recruitmentForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('playerName').value;
    const age = document.getElementById('playerAge').value;
    const rank = document.getElementById('playerRank').value;

    alert(`Teşekkürler ${name}! NBT TEAM oyuncu başvurunuz başarıyla alındı.\nRank: ${rank} | Yaş: ${age}`);
    
    e.target.reset();
});
