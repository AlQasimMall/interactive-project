<!-- روابط المكتبات -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js"></script>

<script>
    // إعدادات Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf1n1TrAzwEMiAI",
        authDomain: "messageemeapp.firebaseapp.com",
        databaseURL: "https://messageemeapp-default-rtdb.firebaseio.com",
        projectId: "messageemeapp",
        storageBucket: "messageemeapp.appspot.com",
        messagingSenderId: "255034474844",
        appId: "1:255034474844:web:5e3b7a6bc4b2fb94cc4199"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const storage = firebase.storage();

    // إنشاء الخريطة باستخدام Leaflet
    let map = L.map('map').setView([33.3152, 44.3661], 8); // الموقع الافتراضي (بغداد)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // وظيفة تحميل السائقين
    function loadDrivers() {
        database.ref('drivers').once('value').then((snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const driver = childSnapshot.val();
                const { lat, lng } = driver.coordinates || {};

                if (lat && lng) {
                    L.marker([lat, lng]).addTo(map).bindPopup(`
                        <b>${driver.name}</b><br>
                        ${driver.carType || ''} - ${driver.carModel || ''}
                    `);
                }
            });
        }).catch((error) => console.error('Error loading drivers:', error));
    }

    // استدعاء دالة تحميل السائقين
    document.addEventListener('DOMContentLoaded', loadDrivers);
</script>
