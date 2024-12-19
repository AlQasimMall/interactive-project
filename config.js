// متغيرات عامة للخريطة
let map;
let markers = [];
let userMarker;
let userLocation = null;
let markerLayer;

// دالة تهيئة الخريطة
function initMap() {
    // التأكد من وجود عنصر الخريطة
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('لم يتم العثور على عنصر الخريطة');
        return;
    }

    // إنشاء الخريطة
    map = L.map('map', {
        center: [33.3152, 44.3661], // بغداد
        zoom: 8,
        zoomControl: false
    });

    // إضافة طبقة الخريطة
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // إضافة التحكم بالتكبير/التصغير
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // إنشاء طبقة العلامات
    markerLayer = L.layerGroup().addTo(map);

    // تفعيل تتبع الموقع
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            updateUserLocation,
            handleLocationError,
            { enableHighAccuracy: true }
        );
    }

    return map;
}

// دالة تحديث موقع المستخدم
function updateUserLocation(position) {
    userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };

    if (!userMarker) {
        const userIcon = L.divIcon({
            html: '<i class="fas fa-user-circle fa-2x" style="color: #007bff;"></i>',
            className: 'user-marker',
            iconSize: [30, 30]
        });

        userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .bindPopup('موقعك الحالي')
            .addTo(map);
    } else {
        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
    }

    map.setView([userLocation.lat, userLocation.lng], map.getZoom());
}

// دالة معالجة أخطاء الموقع
function handleLocationError(error) {
    console.error('خطأ في تحديد الموقع:', error);
    showToast('تعذر الوصول إلى موقعك الحالي. الرجاء التحقق من إعدادات الموقع.', 'error');
}