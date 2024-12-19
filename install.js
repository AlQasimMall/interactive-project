let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    const installButton = document.createElement('button');
    installButton.textContent = 'تثبيت تطبيق تكسي الباشا';
    installButton.classList.add('install-button');
    document.body.appendChild(installButton);

    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('تم تثبيت التطبيق');
            } else {
                console.log('تم رفض التثبيت');
            }
            
            deferredPrompt = null;
            installButton.style.display = 'none';
        }
    });
});

window.addEventListener('appinstalled', (e) => {
    console.log('تم تثبيت التطبيق بنجاح');
    const installButton = document.querySelector('.install-button');
    if (installButton) {
        installButton.style.display = 'none';
    }
});