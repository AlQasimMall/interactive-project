<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js"></script>

    <script>
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

        let map;
        let markers = [];
        let userMarker;
        let userLocation = null;
        let markerLayer;
        let isLoadingDrivers = false; // للتحكم في حالة تحميل البيانات
let isViewingDriverLocation = false; // لتعطيل تحديث موقع المستخدم عند عرض موقع السائق
let currentDriverId = null;
let currentChatDriverId = null;
let userId;

// التحقق من وجود معرف في localStorage
if (!localStorage.getItem('userId')) {
    userId = generateUUID(); // توليد معرف جديد
    localStorage.setItem('userId', userId);
} else {
    userId = localStorage.getItem('userId');
}

function generateUUID() {
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


let currentDriverImage = ''; // متغير لصورة السائق
let currentDriverName = '';  // متغير لاسم السائق
let currentDriverCard = '';  // متغير لبطاقة السائق

function openChatWindow(driverId, driverImage, driverName, driverCard) {
    currentChatDriverId = driverId;
    currentDriverImage = driverImage;
    currentDriverName = driverName;
    currentDriverCard = driverCard;

    // تحديث بيانات السائق في النافذة
    document.getElementById('driverImage').src = driverImage;
    document.getElementById('driverName').innerText = driverName;
    document.getElementById('driverCardInfo').innerText = `بطاقة: ${driverCard}`;

    // إعادة ضبط النافذة: إظهار إدخال الرحلة وإخفاء الرسائل
    document.getElementById('tripSelection').classList.remove('d-none');
    document.querySelector('.chat-footer').classList.add('d-none');
    document.getElementById('chatMessages').classList.add('d-none');

    // إظهار النافذة
    const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
    chatModal.show();
}

function confirmTrip() {
    const tripCount = document.getElementById('tripCount').value;
    const tripDestination = document.getElementById('tripDestination').value;
    const tripType = document.getElementById('tripType').value;
    const tripDays = ["الأحد", "الإثنين", "الثلاثاء"];

    if (tripCount > 0 && tripDestination) {
        const tripData = {
            tripCount: tripCount,
            tripDestination: tripDestination,
            tripType: tripType,
            tripDays: tripDays,
            timestamp: Date.now()
        };

        // إضافة بيانات الرحلة
        database.ref(`chats/${userId}/${currentChatDriverId}/trips`).push(tripData)
            .then(() => {
                // تحديث عدد الرحلات للسائق
                return database.ref(`drivers/${currentChatDriverId}`).transaction((driver) => {
                    if (driver) {
                        driver.trips = (driver.trips || 0) + 1;
                    }
                    return driver;
                });
            })
            .then(() => {
                alert('تم تأكيد الرحلة بنجاح!');
                document.getElementById('tripSelection').classList.add('d-none');
                document.querySelector('.chat-footer').classList.remove('d-none');
                document.getElementById('chatMessages').classList.remove('d-none');
                loadMessages();
                loadDrivers(); // تحديث بطاقة السائق
            })
            .catch((error) => {
                console.error("Error saving trip:", error);
            });
    } else {
        alert('يرجى إدخال جميع البيانات بشكل صحيح.');
    }
}

function addRating(driverId) {
    database.ref(`drivers/${driverId}`).transaction((driver) => {
        if (driver) {
            // زيادة التقييم تدريجياً
            const currentRating = driver.rating || 5;
            const tripsCount = driver.trips || 0;
            
            // معادلة لحساب التقييم الجديد
            // كلما زاد عدد الرحلات، زاد التقييم بشكل أبطأ
            const newRating = Math.min(5, currentRating + (0.1 / Math.sqrt(tripsCount + 1)));
            
            driver.rating = parseFloat(newRating.toFixed(1));
        }
        return driver;
    }).then(() => {
        showToast('تم إضافة التقييم بنجاح');
        loadDrivers(); // تحديث بطاقة السائق
    }).catch((error) => {
        console.error('Error updating rating:', error);
        showToast('حدث خطأ في تحديث التقييم', 'error');
    });
}

function loadTrips() {
    const tripsContainer = document.getElementById('tripsList');
    tripsContainer.innerHTML = ''; // مسح الرحلات السابقة

    database.ref(`chats/${userId}/${currentChatDriverId}/trips`).on('child_added', (snapshot) => {
        const trip = snapshot.val();
        const tripDiv = document.createElement('div');
        tripDiv.className = 'trip-details';
        tripDiv.innerHTML = `
            <p>عدد المشاوير: ${trip.tripCount}</p>
            <p>الوجهة: ${trip.tripDestination}</p>
            <p>نوع الرحلة: ${trip.tripType}</p>
            <p>الأيام: ${trip.tripDays.join(', ')}</p>
            <p>التاريخ: ${new Date(trip.timestamp).toLocaleString()}</p>
        `;
        tripsContainer.appendChild(tripDiv);
    });
}



function sendMessage() {
    const messageInput = document.getElementById('chatInput');
    const messageText = messageInput.value.trim();

    if (messageText) {
        database.ref(`chats/${userId}/${currentChatDriverId}/messages`).push({
            sender: userId,
            text: messageText,
            timestamp: Date.now()
        });
        messageInput.value = ''; // تفريغ حقل الإدخال
    }
}


function loadMessages() {
    const chatBox = document.getElementById('chatMessages');
    chatBox.innerHTML = '';

    database.ref(`chats/${userId}/${currentChatDriverId}/messages`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.innerHTML = `
            <div class="message-bubble ${message.sender === userId ? 'sent' : 'received'}">
                <p>${message.text}</p>
                <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
        `;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}


// استدعاء نافذة المحادثة مع تحديث اسم وصورة السائق
// استدعاء نافذة المحادثة مع تحديث اسم وصورة السائق
function openChatWindow(driverId) {
   console.log('Opening chat for driver:', driverId); // للتأكد من وصول معرف السائق
   currentChatDriverId = driverId;
   showLoading();
   
   database.ref(`drivers/${driverId}`).once('value')
       .then(snapshot => {
           const driverData = snapshot.val();
           console.log('Driver Data:', driverData); // للتأكد من البيانات المستلمة
           
           if (driverData) {
               // الوصول المباشر إلى الصورة من البيانات الرئيسية
               const imageUrl = driverData.imageUrl || 'default-avatar.png';
               // الوصول إلى الاسم من coordinates
               const name = driverData?.name || 'اسم غير متوفر';
               // معلومات السيارة من البيانات الرئيسية
               const carInfo = `${driverData.carType || ''} - ${driverData.carModel || ''}`;

               // تحديث واجهة المستخدم
               const chatModal = document.getElementById('chatModal');
               if (chatModal) {
                   const driverImageElement = chatModal.querySelector('#driverImage');
                   const driverNameElement = chatModal.querySelector('#driverName');
                   const driverCardInfoElement = chatModal.querySelector('#driverCardInfo');

                   if (driverImageElement) {
                       driverImageElement.src = imageUrl;
                       console.log('Setting image URL:', imageUrl); // للتأكد من الرابط
                   }
                   if (driverNameElement) driverNameElement.textContent = name;
                   if (driverCardInfoElement) driverCardInfoElement.textContent = carInfo;

                   // إعادة تعيين حالة المحادثة
                   const tripSelection = chatModal.querySelector('#tripSelection');
                   const chatFooter = chatModal.querySelector('.chat-footer');
                   const chatMessages = chatModal.querySelector('#chatMessages');

                   if (tripSelection) tripSelection.classList.remove('d-none');
                   if (chatFooter) chatFooter.classList.add('d-none');
                   if (chatMessages) {
                       chatMessages.classList.add('d-none');
                       chatMessages.innerHTML = '';
                   }

                   // إظهار النافذة المنبثقة
                   const modalInstance = new bootstrap.Modal(chatModal);
                   modalInstance.show();
               }
           } else {
               showToast('لم يتم العثور على بيانات السائق', 'error');
           }
       })
       .catch(error => {
           console.error('Error fetching driver data:', error);
           showToast('حدث خطأ في تحميل بيانات السائق', 'error');
       })
       .finally(() => {
           hideLoading();
       });
}

function createDriverCard(driver, driverId) {
    return `
        <div class="driver-card">
            <div class="driver-image-container">
                <img src="${driver.imageUrl || 'default-avatar.png'}" class="driver-image">
            </div>
            <div class="driver-info">
                <h3 class="driver-name">${driver.name || 'اسم غير متوفر'}</h3>
                <button class="btn btn-primary" onclick="openChatWindow('${driverId}')">فتح المحادثة</button>
            </div>
        </div>
    `;
}




function viewDriverLocation(driverId) {
    isViewingDriverLocation = true; // تعطيل تحديث موقع المستخدم

    database.ref(`drivers/${driverId}`).once('value', (snapshot) => {
        const driver = snapshot.val();
        if (driver && driver.coordinates) {
            const { lat, lng } = driver.coordinates;

            // تعيين موقع الخريطة إلى موقع السائق
            map.setView([lat, lng], 15);

            // إضافة علامة موقع السائق
            const driverMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `<i class="fas fa-taxi" style="color: #FFD700;"></i>`,
                    className: 'driver-marker',
                    iconSize: [30, 30],
                }),
            }).addTo(markerLayer);

            driverMarker.bindPopup(`
                <div style="text-align: center;">
                    <h6>${driver.name}</h6>
                    <p>${driver.carType} - ${driver.carModel}</p>
                    <button class="action-btn secondary" onclick="openChatWindow('${key}')">
    <i class="fas fa-comment"></i> مراسلة
</button>


                </div>
            `).openPopup();

            scrollToMap();
        } else {
            showToast('لم يتم إضافة موقع للسائق', 'error');
        }
    });

    // إعادة تفعيل تحديث موقع المستخدم بعد فترة
    setTimeout(() => {
        isViewingDriverLocation = false;
    }, 30000); // 30 ثانية
}
function viewDriverLocation(driverId) {
    database.ref(`drivers/${driverId}`).once('value', (snapshot) => {
        const driver = snapshot.val();
        if (driver && driver.coordinates) {
            const { lat, lng } = driver.coordinates;
            map.flyTo([lat, lng], 15, {
                animate: true,
                duration: 1.5
            });

            markerLayer.clearLayers();

            const driverMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `
                        <div style="position: relative; text-align: center;">
                            <img src="${driver.imageUrl || 'default-avatar.png'}" 
                                 alt="صورة السائق" 
                                 style="width: 50px; height: 50px; border: 3px solid #FFD700; 
                                 border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                            <i class="fas fa-taxi" 
                               style="position: absolute; bottom: -5px; right: 50%; transform: translateX(50%); 
                               color: #FFD700; font-size: 1.5rem;"></i>
                        </div>
                    `,
                    className: 'driver-marker',
                    iconSize: [60, 60],
                }),
            }).addTo(markerLayer);

            const popupContent = `
                <div style="text-align: center; font-family: 'Segoe UI', sans-serif; min-width: 200px;">
                    <div class="driver-popup-header" style="margin-bottom: 10px;">
                        <img src="${driver.imageUrl || 'default-avatar.png'}" 
                             alt="صورة السائق" 
                             style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #FFD700; 
                             margin-bottom: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                        <h5 style="color: #333; font-weight: bold; margin: 8px 0;">${driver.name}</h5>
                    </div>
                    
                    <div class="driver-popup-stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 15px;">
                        <div style="text-align: center;">
                            <div style="font-weight: bold; color: #FFD700;">
                                <i class="fas fa-star"></i> ${driver.rating ? driver.rating.toFixed(1) : '5.0'}
                            </div>
                            <div style="font-size: 0.8rem; color: #666;">التقييم</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: bold; color: #333;">
                                <i class="fas fa-route"></i> ${driver.trips || 0}
                            </div>
                            <div style="font-size: 0.8rem; color: #666;">الرحلات</div>
                        </div>
                    </div>
                    
                    <div class="driver-popup-info" style="margin-bottom: 15px; text-align: right;">
                        <p style="margin: 5px 0;">
                            <i class="fas fa-car" style="color: #FFD700; margin-left: 5px;"></i>
                            ${driver.carType} - ${driver.carModel}
                        </p>
                        <p style="margin: 5px 0;">
                            <i class="fas fa-map-marker-alt" style="color: #FFD700; margin-left: 5px;"></i>
                            ${driver.location}
                        </p>
                        <p style="margin: 5px 0;">
                            <i class="fas fa-phone" style="color: #FFD700; margin-left: 5px;"></i>
                            ${driver.phone}
                        </p>
                    </div>

                    <div class="driver-popup-actions" style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                        <button onclick="openChatWindow('${driverId}')" 
                                style="background: #FFD700; color: #333; border: none; padding: 8px 15px; 
                                border-radius: 20px; cursor: pointer; font-weight: bold; 
                                display: flex; align-items: center; justify-content: center; gap: 5px;
                                transition: all 0.3s ease;">
                            <i class="fas fa-comment"></i>
                            مراسلة السائق
                        </button>
                    </div>
                </div>
            `;

            driverMarker.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'custom-popup'
            }).openPopup();

            scrollToMap();

            Swal.fire({
                title: '🚖 تم تحديد موقع السائق!',
                html: `
                    <p style="font-size: 1rem; color: #555;">
                        السائق <b>${driver.name}</b> بانتظارك.
                    </p>
                    <p style="color: #666;">هل ترغب بمراسلته الآن؟</p>
                `,
                icon: 'success',
                showCancelButton: true,
                confirmButtonColor: '#FFD700',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '📨 نعم، مراسلة السائق',
                cancelButtonText: '❌ إغلاق',
            }).then((result) => {
                if (result.isConfirmed) {
                    openChatWindow(driverId);
                }
            });
        } else {
            showToast('لم يتم العثور على موقع السائق.', 'error');
        }
    });
}


        function initMap() {
            // الإحداثيات الافتراضية
            const defaultLocation = [33.3152, 44.3661];
        
            // إنشاء الخريطة مع خيارات التخصيص
            map = L.map('map', {
                center: defaultLocation,
                zoom: 8,
                zoomControl: false, // إخفاء التحكم الافتراضي بالتكبير/التصغير
                attributionControl: false, // إخفاء شريط النسب
            });
            const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
            }).addTo(map);
            // إضافة زر تكبير/تصغير مخصص
            L.control.zoom({
                position: 'topright',
            }).addTo(map);
        
            // إضافة زر شريط النسبة المخصص
            L.control.attribution({
                position: 'bottomleft',
                prefix: '<a href="https://leafletjs.com" target="_blank">Leaflet</a>',
            }).addTo(map);
        
            // إضافة طبقة علامات مخصصة
            markerLayer = L.layerGroup().addTo(map);
        
            // تمكين الموقع الجغرافي
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition(
                    updateUserLocation,
                    handleLocationError,
                    { enableHighAccuracy: true }
                );
            }
        
            // إضافة أزرار التبديل بين الطبقات
            const layersControl = {
                "خريطة الشوارع": tileLayer,
                "خريطة القمر الصناعي": L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                    attribution: '© Google',
                }),
            };
        
            L.control.layers(layersControl).addTo(map);
        }
        
     function updateUserLocation(position) {
    const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
    };

    // تحقق إذا تغير الموقع بما يكفي لتحديث الخريطة
    if (!userLocation || Math.abs(newLocation.lat - userLocation.lat) > 0.0001 || Math.abs(newLocation.lng - userLocation.lng) > 0.0001) {
        userLocation = newLocation;

        // تحديث علامة المستخدم فقط إذا تغير الموقع
        const userIcon = L.divIcon({
            html: '<i class="fas fa-user-circle fa-2x" style="color: #007bff;"></i>',
            className: 'user-marker',
            iconSize: [30, 30],
        });

        if (!userMarker) {
            userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                .bindPopup('موقعك الحالي')
                .addTo(map);
        } else {
            userMarker.setLatLng([userLocation.lat, userLocation.lng]);
        }

        // تحديث الخريطة مرة واحدة فقط
        map.setView([userLocation.lat, userLocation.lng], 13);

        // تحميل السائقين إذا كان الموقع جديدًا
        loadDrivers();
    }
}


// قاموس يحتوي على إحداثيات المحافظات والمناطق العراقية
const locationCoordinates = {
    "بغداد": { lat: 33.3152, lng: 44.3661 },
    "الكرخ": { lat: 33.3024, lng: 44.3937 },
    "الرصافة": { lat: 33.3319, lng: 44.4445 },
    "البصرة": { lat: 30.5085, lng: 47.7804 },
    "نينوى": { lat: 36.3359, lng: 43.1194 },
    "الموصل": { lat: 36.3359, lng: 43.1194 },
    "النجف": { lat: 31.9892, lng: 44.3405 },
    "الكوفة": { lat: 32.0343, lng: 44.4019 },
    "كربلاء": { lat: 32.6101, lng: 44.0241 },
    "الحسينية": { lat: 32.6239, lng: 44.0179 },
    "أربيل": { lat: 36.1901, lng: 44.0091 },
    "كركوك": { lat: 35.4681, lng: 44.3923 },
    "الأنبار": { lat: 33.3784, lng: 43.1441 },
    "الرمادي": { lat: 33.4250, lng: 43.3001 },
    "الفلوجة": { lat: 33.3538, lng: 43.7789 },
    "بابل": { lat: 32.4680, lng: 44.4491 },
    "الحلة": { lat: 32.4689, lng: 44.4217 },
    "المسيب": { lat: 32.8471, lng: 44.2907 },
    "الهاشمية": { lat: 32.2482, lng: 44.6027 },
    "القاسم": { lat: 32.2973, lng: 44.5907 },
    "ديالى": { lat: 33.7752, lng: 44.6451 },
    "بعقوبة": { lat: 33.7474, lng: 44.6537 },
    "ذي قار": { lat: 31.0529, lng: 46.2590 },
    "الناصرية": { lat: 31.0529, lng: 46.2590 },
    "السليمانية": { lat: 35.5556, lng: 45.4350 },
    "صلاح الدين": { lat: 34.6108, lng: 43.6782 },
    "تكريت": { lat: 34.6707, lng: 43.6789 },
    "واسط": { lat: 32.5141, lng: 45.8206 },
    "الكوت": { lat: 32.5141, lng: 45.8206 },
    "ميسان": { lat: 31.8389, lng: 47.1451 },
    "العمارة": { lat: 31.8389, lng: 47.1451 },
    "المثنى": { lat: 31.3289, lng: 45.2792 },
    "السماوة": { lat: 31.3199, lng: 45.2847 },
    "دهوك": { lat: 36.8695, lng: 42.9505 },
    "القادسية": { lat: 31.9889, lng: 44.9252 },
    "الديوانية": { lat: 31.9889, lng: 44.9252 }
};

function getCoordinatesForLocation(location) {
    // تحقق من وجود الموقع في القاموس
    if (locationCoordinates[location]) {
        return locationCoordinates[location];
    }
    
    // إذا لم يتم العثور على الموقع، نرجع إحداثيات بغداد كقيمة افتراضية
    console.warn(`لم يتم العثور على إحداثيات لـ ${location}، سيتم استخدام إحداثيات بغداد`);
    return locationCoordinates["بغداد"];
}

// مثال على الاستخدام في دالة إضافة السائق
async function handleAddDriver(event) {
    event.preventDefault();
    
    const location = document.getElementById('driverLocation').value;
    const coordinates = getCoordinatesForLocation(location);
    
    // استخدام الإحداثيات في البيانات المرسلة
    
    const driverData = {
        // ... البيانات الأخرى
        latitude: coordinates.lat,
        longitude: coordinates.lng
    };
    
    // إكمال عملية إضافة السائق
    try {
        // ... كود إرسال البيانات
    } catch (error) {
        console.error('Error adding driver:', error);
    }
}
        
        function handleLocationError(error) {
            // التعامل مع خطأ في الموقع الجغرافي
            console.error('خطأ في تحديد الموقع:', error);
            showToast('تعذر الوصول إلى موقعك الحالي. الرجاء التحقق من إعدادات الموقع.', 'error');
        }
        

        function createDriverCard(driver, key) {
    const distance = userLocation ? calculateDistance(userLocation, driver.coordinates) : null;

    return `
        <div class="driver-card animate__animated animate__fadeIn">
            <div class="driver-image-container">
                <img src="${driver.imageUrl}" alt="${driver.name}" class="driver-image">
                <div class="driver-status ${driver.active ? 'status-active' : 'status-inactive'}" 
                     onclick="toggleDriverStatus('${key}', ${driver.active})">
                    ${driver.active ? 'متاح' : 'مشغول'}
                </div>
            </div>
            <div class="driver-info">
                <h5 class="driver-name">${driver.name}</h5>
                <div class="driver-stats">
                    <div class="stat-item">
                        <div class="stat-value">
                            <i class="fas fa-star" style="color: #FFD700;"></i>
                            ${driver.rating.toFixed(1)}
                        </div>
                        <div class="stat-label">التقييم</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">
                            <i class="fas fa-route"></i>
                            ${driver.trips}
                        </div>
                        <div class="stat-label">الرحلات</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">
                            ${distance ? distance.toFixed(1) : '--'}
                        </div>
                        <div class="stat-label">كم</div>
                    </div>
                </div>
                <div class="text-muted">
                    <p class="mb-2">
                        <i class="fas fa-car me-2"></i>
                        ${driver.carType} ${driver.carModel}
                    </p>
                    <p class="mb-0">
                        <i class="fas fa-map-marker-alt me-2"></i>
                        ${driver.location}
                    </p>
                </div>
            </div>
            <div class="driver-actions">
                <button class="action-btn primary" onclick="bookDriver('${key}')">
                    <i class="fas fa-taxi"></i>
                    حجز
                </button>
                <button class="action-btn secondary" onclick="openChatWindow('${key}')">
                    <i class="fas fa-comment"></i> مراسلة
                </button>
            </div>
        </div>
    `;
}


function bookDriver(driverId) {
    showLoading();
    database.ref(`drivers/${driverId}`).once('value', (snapshot) => {
        const driver = snapshot.val();
        if (driver && driver.active) {
            setTimeout(() => {
                hideLoading();
                database.ref(`drivers/${driverId}`).update({
                    active: false // تعيين الحالة إلى "مشغول"
                }).then(() => {
                    showToast(`تم إرسال طلب الحجز إلى ${driver.name}`);
                    window.location.href = `tel:${driver.phone}`;
                    loadDrivers(); // تحديث حالة السائقين في الواجهة
                });
            }, 1500);
        } else {
            hideLoading();
            showToast('السائق غير متاح حالياً', 'error');
        }
    });
}


       






function scrollToMap() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


        
        
function updateRequiredTrips(driverId, count) {
    const tripCount = parseInt(count, 10);
    if (isNaN(tripCount) || tripCount < 0) {
        showToast('الرجاء إدخال عدد صحيح للمشاوير', 'error');
        return;
    }

    database.ref(`drivers/${driverId}`).update({
        requiredTrips: tripCount
    }).then(() => {
        showToast('تم تحديث عدد المشاوير بنجاح');
    }).catch((error) => {
        console.error('Error updating required trips:', error);
        showToast('حدث خطأ أثناء تحديث عدد المشاوير', 'error');
    });
}
        

        function setTripCount(driverId) {
            const modal = new bootstrap.Modal(document.getElementById('tripCountModal'));
            modal.show();
        
            document.getElementById('tripCountForm').onsubmit = async (event) => {
                event.preventDefault();
                const tripCount = document.getElementById('tripCount').value;
        
                try {
                    await database.ref(`drivers/${driverId}`).update({
                        tripsRequired: parseInt(tripCount)
                    });
                    showToast('تم تحديث عدد المشاوير بنجاح');
                    modal.hide();
                } catch (error) {
                    console.error('Error updating trip count:', error);
                    showToast('حدث خطأ أثناء تحديث عدد المشاوير', 'error');
                }
            };
        }
        

       function calculateDistance(point1, point2) {
    // التحقق من صحة النقاط
    if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
        return null;
    }

    const R = 6371;
    const dLat = toRad(point2.lat - point1.lat);
    const dLon = toRad(point2.lng - point1.lng);
    const lat1 = toRad(point1.lat);
    const lat2 = toRad(point2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(degrees) {
    return degrees * Math.PI / 180;
}

function loadDrivers(location = 'all') {
    if (isLoadingDrivers) return;
    isLoadingDrivers = true;

    showLoading();
    const driversRef = database.ref('drivers');
    
    driversRef.once('value')
        .then((snapshot) => {
            const driversGrid = document.getElementById('driversGrid');
            driversGrid.innerHTML = '';
            markerLayer.clearLayers();

            snapshot.forEach((childSnapshot) => {
                const driver = childSnapshot.val();
                if (location === 'all' || driver.location === location) {
                    driversGrid.innerHTML += createDriverCard(driver, childSnapshot.key);

                    if (driver.coordinates) {
                        const { lat, lng } = driver.coordinates;

                        // إنشاء العلامة بمعلومات السائق
                        const driverMarker = L.marker([lat, lng], {
                            icon: L.divIcon({
                                html: `<img src="${driver.imageUrl}" 
                                              alt="صورة السائق" 
                                              style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid #FFD700;">`,
                                className: 'driver-marker',
                                iconSize: [40, 40],
                            }),
                        }).addTo(markerLayer);

                        // تحديث النافذة المنبثقة
                        driverMarker.bindPopup(`
                            <div style="text-align: center;">
                                <div style="margin-bottom: 10px;">
                                    <img src="${driver.imageUrl || 'default-avatar.png'}" 
                                         alt="صورة السائق" 
                                         style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid #FFD700; margin-bottom: 10px;">
                                    <h6 style="margin: 5px 0; font-weight: bold;">${driver.name}</h6>
                                </div>
                                
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">
                                    <div>
                                        <i class="fas fa-star" style="color: #FFD700;"></i>
                                        ${driver.rating ? driver.rating.toFixed(1) : '5.0'}
                                    </div>
                                    <div>
                                        <i class="fas fa-route"></i>
                                        ${driver.trips || 0}
                                    </div>
                                </div>

                                <div style="margin-bottom: 10px;">
                                    <p style="margin: 5px 0;">🚗 ${driver.carType} - ${driver.carModel}</p>
                                    <p style="margin: 5px 0;">📍 ${driver.location}</p>
                                </div>

                                <button onclick="openChatWindow('${childSnapshot.key}')" 
                                        style="background: #FFD700; color: #333; border: none; 
                                               padding: 8px 15px; border-radius: 20px; width: 100%;
                                               cursor: pointer; display: flex; align-items: center; 
                                               justify-content: center; gap: 5px; font-weight: bold;">
                                    <i class="fas fa-comment"></i>
                                    مراسلة السائق
                                </button>
                            </div>
                        `, {
                            maxWidth: 250
                        });
                    }
                }
            });

            hideLoading();
        })
        .catch((error) => {
            console.error('Error loading drivers:', error);
            showToast('حدث خطأ في تحميل بيانات السائقين', 'error');
        })
        .finally(() => {
            isLoadingDrivers = false;
        });
}

// تحديث دالة إنشاء بطاقة السائق
// دالة إنشاء بطاقة السائق المحدثة
function createDriverCard(driver, key) {
    const distance = userLocation && driver.coordinates ? 
        calculateDistance(userLocation, driver.coordinates) : null;

    return `
        <div class="driver-card animate__animated animate__fadeIn" data-driver-id="${key}">
            <!-- أزرار الحذف والتعديل -->
            <div class="driver-card-actions">
                <button class="action-icon delete-btn" onclick="confirmDeleteDriver('${key}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <button class="action-icon edit-btn" onclick="showEditDriverModal('${key}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>

            <div class="driver-image-container">
                <img src="${driver.imageUrl}" alt="${driver.name}" class="driver-image">
                <div class="driver-status ${driver.active ? 'status-active' : 'status-inactive'}">
                    ${driver.active ? 'متاح' : 'مشغول'}
                </div>
            </div>
               <div class="driver-info">
    <h5 class="driver-name">${driver.name}</h5>
    <div class="driver-stats">
        <div class="stat-item" onclick="addRating('${key}')" style="cursor: pointer">
            <div class="stat-value">
                <i class="fas fa-star" style="color: #FFD700;"></i>
                ${driver.rating ? driver.rating.toFixed(1) : '5.0'}
            </div>
            <div class="stat-label">اضغط للتقييم</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">
                <i class="fas fa-route"></i>
                ${driver.trips || 0}
            </div>
            <div class="stat-label">عدد الرحلات</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">
                ${distance ? distance.toFixed(1) : '--'}
            </div>
            <div class="stat-label">كم</div
                    </div>
                </div>
                <div class="text-muted">
                    <p class="mb-2">
                        <i class="fas fa-car me-2"></i>
                        ${driver.carType} ${driver.carModel}
                    </p>
                    <p class="mb-0">
                        <i class="fas fa-map-marker-alt me-2"></i>
                        ${driver.location}
                    </p>
                </div>
            </div>
            <div class="driver-actions">
                <button class="action-btn primary" onclick="viewDriverLocation('${key}')">
                    <i class="fas fa-map-marker-alt"></i>
                    عرض الموقع
                </button>
               <button class="action-btn secondary" onclick="openChatWindow('${key}')">
    <i class="fas fa-comment"></i> مراسلة
</button>


            </div>
        </div>
    `;
}



// دالة تأكيد الحذف مع نافذة تأكيد محسنة
function confirmDeleteDriver(driverId) {
    // استخدام نافذة تأكيد محسنة
    Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من حذف هذا السائق؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteDriver(driverId); // استدعاء دالة الحذف إذا وافق المستخدم
        }
    });
}

// دالة حذف السائق
async function deleteDriver(driverId) {
    try {
        // عرض مؤشر التحميل
        showLoading();

        // الوصول إلى مرجع بيانات السائق
        const driverRef = database.ref(`drivers/${driverId}`);
        const snapshot = await driverRef.once('value');
        const driverData = snapshot.val();

        if (!driverData) {
            // إذا لم يتم العثور على بيانات السائق
            showToast('لم يتم العثور على السائق', 'error');
            return;
        }

        // حذف الصورة من التخزين إذا كانت موجودة
        if (driverData.imageUrl) {
            try {
                const imageRef = storage.refFromURL(driverData.imageUrl);
                await imageRef.delete();
            } catch (error) {
                console.error('Error deleting image:', error);
                showToast('حدث خطأ أثناء حذف صورة السائق', 'error');
            }
        }

        // حذف بيانات السائق من قاعدة البيانات
        await driverRef.remove();

        // إزالة بطاقة السائق من الواجهة
        const card = document.querySelector(`[data-driver-id="${driverId}"]`);
        if (card) {
            // إضافة تأثير حذف قبل الإزالة
            card.classList.add('animate__fadeOut');
            setTimeout(() => card.remove(), 300);
        }

        // عرض رسالة نجاح
        showToast('تم حذف السائق بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting driver:', error);
        showToast('حدث خطأ أثناء حذف السائق', 'error');
    } finally {
        // إخفاء مؤشر التحميل
        hideLoading();
    }
}


// دالة إظهار نافذة التعديل
function showEditDriverModal(driverId) {
    database.ref(`drivers/${driverId}`).once('value')
        .then(snapshot => {
            const driver = snapshot.val();
            if (driver) {
                document.getElementById('editDriverId').value = driverId;
                document.getElementById('editDriverName').value = driver.name;
                document.getElementById('editDriverPhone').value = driver.phone;
                document.getElementById('editCarType').value = driver.carType;
                document.getElementById('editCarModel').value = driver.carModel;
                document.getElementById('editDriverLocation').value = driver.location;
                
                if (driver.imageUrl) {
                    document.getElementById('editImagePreview').src = driver.imageUrl;
                    document.getElementById('editImagePreview').style.display = 'block';
                }

                const editModal = new bootstrap.Modal(document.getElementById('editDriverModal'));
                editModal.show();
            }
        })
        .catch(error => {
            console.error('Error fetching driver data:', error);
            showToast('حدث خطأ في تحميل بيانات السائق', 'error');
        });
}

// دالة معالجة تعديل البيانات
async function handleEditDriver(event) {
    event.preventDefault();
    showLoading();

    try {
        const driverId = document.getElementById('editDriverId').value;
        const imageFile = document.getElementById('editDriverImage').files[0];
        let updates = {
            name: document.getElementById('editDriverName').value,
            phone: document.getElementById('editDriverPhone').value,
            carType: document.getElementById('editCarType').value,
            carModel: document.getElementById('editCarModel').value,
            location: document.getElementById('editDriverLocation').value
        };

        if (imageFile) {
            const imageRef = storage.ref(`drivers/${Date.now()}_${imageFile.name}`);
            const uploadTask = await imageRef.put(imageFile);
            updates.imageUrl = await uploadTask.ref.getDownloadURL();
        }

        await database.ref(`drivers/${driverId}`).update(updates);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('editDriverModal'));
        modal.hide();
        
        showToast('تم تحديث بيانات السائق بنجاح');
        loadDrivers();
    } catch (error) {
        console.error('Error updating driver:', error);
        showToast('حدث خطأ أثناء تحديث البيانات', 'error');
    } finally {
        hideLoading();
    }
}

// دوال إضافية للحذف والتعديل
function confirmDeleteDriver(driverId) {
    Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من حذف هذا السائق؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteDriver(driverId);
        }
    });
}

async function deleteDriver(driverId) {
    try {
        showLoading();
        
        // حذف بيانات السائق من قاعدة البيانات
        const driverRef = database.ref(`drivers/${driverId}`);
        const driverSnapshot = await driverRef.once('value');
        const driverData = driverSnapshot.val();
        
        if (driverData && driverData.imageUrl) {
            // حذف الصورة من التخزين
            const imageRef = storage.refFromURL(driverData.imageUrl);
            await imageRef.delete();
        }
        
        // حذف البيانات
        await driverRef.remove();
        
        // حذف البطاقة من الواجهة مع تأثير حركي
        const driverCard = document.querySelector(`[data-driver-id="${driverId}"]`);
        if (driverCard) {
            driverCard.classList.add('animate__fadeOut');
            setTimeout(() => driverCard.remove(), 300);
        }
        
        showToast('تم حذف السائق بنجاح');
    } catch (error) {
        console.error('Error deleting driver:', error);
        showToast('حدث خطأ أثناء حذف السائق', 'error');
    } finally {
        hideLoading();
    }
}


function showEditDriverModal(driverId) {
    database.ref(`drivers/${driverId}`).once('value')
        .then(snapshot => {
            const driver = snapshot.val();
            if (driver) {
                // ملء النموذج ببيانات السائق الحالية
                document.getElementById('editDriverId').value = driverId;
                document.getElementById('editDriverName').value = driver.name;
                document.getElementById('editDriverPhone').value = driver.phone;
                document.getElementById('editCarType').value = driver.carType;
                document.getElementById('editCarModel').value = driver.carModel;
                document.getElementById('editDriverLocation').value = driver.location;
                document.getElementById('editDriverBio').value = driver.bio || '';
                
                if (driver.imageUrl) {
                    document.getElementById('editImagePreview').src = driver.imageUrl;
                    document.getElementById('editImagePreview').style.display = 'block';
                    document.querySelector('#editDriverModal .upload-placeholder').style.display = 'none';
                }
                
                // عرض النافذة المنبثقة
                const editModal = new bootstrap.Modal(document.getElementById('editDriverModal'));
                editModal.show();
            }
        })
        .catch(error => {
            console.error('Error fetching driver data:', error);
            showToast('حدث خطأ في تحميل بيانات السائق', 'error');
        });
}

async function handleEditDriver(event) {
    event.preventDefault();
    showLoading();

    const driverId = document.getElementById('editDriverId').value;
    const imageFile = document.getElementById('editDriverImage').files[0];
    
    try {
        let imageUrl;
        if (imageFile) {
            const imageRef = storage.ref(`drivers/${Date.now()}_${imageFile.name}`);
            const uploadTask = await imageRef.put(imageFile);
            imageUrl = await uploadTask.ref.getDownloadURL();
        }

        const updates = {
            name: document.getElementById('editDriverName').value,
            phone: document.getElementById('editDriverPhone').value,
            carType: document.getElementById('editCarType').value,
            carModel: document.getElementById('editCarModel').value,
            location: document.getElementById('editDriverLocation').value,
            bio: document.getElementById('editDriverBio').value
        };

        if (imageUrl) {
            updates.imageUrl = imageUrl;
        }

        await database.ref(`drivers/${driverId}`).update(updates);

        // إغلاق النافذة المنبثقة
        const modal = bootstrap.Modal.getInstance(document.getElementById('editDriverModal'));
        modal.hide();

        showToast('تم تحديث بيانات السائق بنجاح');
        loadDrivers(); // تحديث عرض السائقين
    } catch (error) {
        console.error('Error updating driver:', error);
        showToast('حدث خطأ أثناء تحديث البيانات', 'error');
    } finally {
        hideLoading();
    }
}

function handleEditImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('editImagePreview');
            const placeholder = document.querySelector('#editDriverModal .upload-placeholder');
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
}
        

        function handleImagePreview(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('imagePreview');
                    const placeholder = document.querySelector('.upload-placeholder');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    placeholder.style.display = 'none';
                }
                reader.readAsDataURL(file);
            }
        }

async function handleAddDriver(event) {
    event.preventDefault();
    showLoading();

    try {
        const imageFile = document.getElementById('driverImage').files[0];
        if (!imageFile) {
            throw new Error('الرجاء اختيار صورة للسائق');
        }

        // الحصول على الإحداثيات من اسم الموقع
        const location = document.getElementById('driverLocation').value;
        const coordinates = await getCoordinatesForLocation(location);

        const imageRef = storage.ref(`drivers/${Date.now()}_${imageFile.name}`);
        const uploadTask = await imageRef.put(imageFile);
        const imageUrl = await uploadTask.ref.getDownloadURL();

        const driverData = {
            name: document.getElementById('driverName').value,
            phone: document.getElementById('driverPhone').value,
            carType: document.getElementById('carType').value,
            carModel: document.getElementById('carModel').value,
            location: location,
            coordinates: coordinates, // استخدام الإحداثيات التي تم الحصول عليها
            bio: document.getElementById('driverBio').value,
            imageUrl: imageUrl,
            rating: 5,
            trips: 0,
            active: true,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        await database.ref('drivers').push(driverData);

        // إغلاق النافذة المنبثقة بعد النجاح
        const modal = bootstrap.Modal.getInstance(document.getElementById('addDriverModal'));
        modal.hide();
        
        document.getElementById('addDriverForm').reset();
        showToast('تم إضافة السائق بنجاح');
        loadDrivers();
    } catch (error) {
        console.error('Error adding driver:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

        function bookDriver(driverId) {
    showLoading();
    database.ref(`drivers/${driverId}`).once('value', (snapshot) => {
        const driver = snapshot.val();
        if (driver && driver.active) {
            setTimeout(() => {
                hideLoading();
                database.ref(`drivers/${driverId}`).update({
                    active: false // تعيين الحالة إلى "مشغول"
                }).then(() => {
                    showToast(`تم إرسال طلب الحجز إلى ${driver.name}`);
                    window.location.href = `tel:${driver.phone}`;
                    loadDrivers(); // تحديث حالة السائقين في الواجهة
                });
            }, 1500);
        } else {
            hideLoading();
            showToast('السائق غير متاح حالياً', 'error');
        }
    });
}


        function messageDriver(driverId) {
            database.ref(`drivers/${driverId}`).once('value', (snapshot) => {
                const driver = snapshot.val();
                if (driver) {
                    const phoneNumber = driver.phone.replace(/[^0-9]/g, '');
                    window.open(`https://wa.me/${phoneNumber}`, '_blank');
                }
            });
        }

        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `custom-toast animate__animated animate__fadeInRight`;
            toast.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle text-success' : 'fa-exclamation-circle text-danger'} me-2"></i>
                <div>${message}</div>
            `;
            
            document.getElementById('toastContainer').appendChild(toast);
            
            setTimeout(() => {
                toast.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
       function messageDriver(driverId) {
    database.ref(`drivers/${driverId}`).once('value', (snapshot) => {
        const driver = snapshot.val();

        if (driver) {
            // تحديد السائق الحالي للدردشة
            currentChatDriverId = driverId;

            // فتح نافذة الدردشة
            const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
            document.getElementById('chatMessages').innerHTML = ''; // تفريغ الرسائل السابقة
            loadMessages(); // تحميل الرسائل السابقة بين المستخدم والسائق
            chatModal.show();
        } else {
            showToast('عذراً، لا يمكن العثور على معلومات السائق.', 'error');
        }
    });
}

// دالة مساعدة للتحقق من صلاحيات الموقع
function checkLocationPermission() {
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' })
            .then(permission => {
                if (permission.state === 'denied') {
                    showToast('يرجى تفعيل خدمة الموقع للحصول على أفضل تجربة.', 'error');
                }
            });
    }
}

// تحديث دالة updateUserLocation لتخزين الموقع الأخير
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
    
    // تحديث مركز الخريطة
    map.setView([userLocation.lat, userLocation.lng], map.getZoom());
}

        function showLoading() {
            document.getElementById('loadingSpinner').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('loadingSpinner').style.display = 'none';
        }

        function showAddDriverModal() {
            const modal = new bootstrap.Modal(document.getElementById('addDriverModal'));
            modal.show();
        }
        window.addEventListener('scroll', function() {
    const filter = document.querySelector('.location-filter');
    if (window.scrollY > 100) {
        filter.classList.add('sticky');
    } else {
        filter.classList.remove('sticky');
    }
});


// دالة البحث الرئيسية
function searchDrivers(searchTerm, searchType = 'all') {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';

    if (!searchTerm.trim()) {
        resultsContainer.innerHTML = '';
        return;
    }

    const driversRef = database.ref('drivers');
    driversRef.once('value')
        .then((snapshot) => {
            const results = [];
            snapshot.forEach((childSnapshot) => {
                const driver = childSnapshot.val();
                const driverId = childSnapshot.key;
                
                const searchLower = searchTerm.toLowerCase();
                let match = false;

                switch(searchType) {
                    case 'name':
                        match = driver.name.toLowerCase().includes(searchLower);
                        break;
                    case 'location':
                        match = driver.location.toLowerCase().includes(searchLower);
                        break;
                    case 'car':
                        match = driver.carType.toLowerCase().includes(searchLower) || 
                               driver.carModel.toString().includes(searchLower);
                        break;
                    default:
                        match = driver.name.toLowerCase().includes(searchLower) || 
                               driver.location.toLowerCase().includes(searchLower) ||
                               driver.carType.toLowerCase().includes(searchLower) ||
                               driver.carModel.toString().includes(searchLower);
                }

                if (match) {
                    results.push({ ...driver, id: driverId });
                }
            });
            
            displaySearchResults(results, searchTerm);
        })
        .catch((error) => {
            console.error("Error searching:", error);
            resultsContainer.innerHTML = '<div class="no-results">حدث خطأ في البحث</div>';
        });
}

// دالة عرض نتائج البحث
function displaySearchResults(results, searchTerm) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">لا توجد نتائج للبحث</div>';
        return;
    }

    resultsContainer.innerHTML = results.map(driver => `
        <div class="search-result-item" onclick="handleDriverSelect('${driver.id}')">
            <div class="driver-info">
                <img src="${driver.imageUrl}" alt="${driver.name}" class="driver-image">
                <div class="driver-details">
                    <div class="driver-name">${highlightText(driver.name, searchTerm)}</div>
                    <div class="driver-meta">
                        <i class="fas fa-map-marker-alt"></i> 
                        ${highlightText(driver.location, searchTerm)}
                    </div>
                    <div class="driver-meta">
                        <i class="fas fa-car"></i> 
                        ${highlightText(driver.carType, searchTerm)} ${highlightText(driver.carModel.toString(), searchTerm)}
                    </div>
                </div>
                <div class="driver-status ${driver.active ? 'text-success' : 'text-danger'}">
                    <i class="fas fa-circle"></i>
                </div>
            </div>
        </div>
    `).join('');
}

// دالة تمييز نص البحث
function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// دالة معالجة اختيار السائق
function handleDriverSelect(driverId) {
    viewDriverLocation(driverId);
    const modal = bootstrap.Modal.getInstance(document.getElementById('searchModal'));
    modal.hide();
}

// إعداد مستمعي الأحداث
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('navbarSearchInput');
    const searchTypeInputs = document.querySelectorAll('input[name="searchType"]');
    let searchTimeout;

    // مستمع حدث البحث
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchType = document.querySelector('input[name="searchType"]:checked').id.replace('search', '').toLowerCase();
            searchDrivers(e.target.value, searchType);
        }, 300);
    });

    // مستمع حدث تغيير نوع البحث
    searchTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (searchInput.value) {
                const searchType = input.id.replace('search', '').toLowerCase();
                searchDrivers(searchInput.value, searchType);
            }
        });
    });

    // تنظيف البحث عند إغلاق النافذة المنبثقة
    document.getElementById('searchModal').addEventListener('hidden.bs.modal', () => {
        searchInput.value = '';
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('searchAll').checked = true;
    });
});



        function filterDrivers(searchTerm) {
            const driverCards = document.querySelectorAll('.driver-card');
            searchTerm = searchTerm.toLowerCase();
            
            driverCards.forEach(card => {
                const driverName = card.querySelector('.driver-name').textContent.toLowerCase();
                const driverLocation = card.querySelector('.text-muted').textContent.toLowerCase();
                
                if (driverName.includes(searchTerm) || driverLocation.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

       document.addEventListener('DOMContentLoaded', () => {
    if (!window.mapInitialized) {
        window.mapInitialized = true;
        initMap();
    }

    const locationChips = document.querySelectorAll('.location-chip');
    locationChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            locationChips.forEach((c) => c.classList.remove('active'));
            chip.classList.add('active');
            const location = chip.dataset.location;
            loadDrivers(location);
        });
    });

    loadDrivers(); // استدعاء التحميل الأولي للسائقين.
});



           // دالة لإظهار تنبيه عند الضغط على زر
function showAlert(cardName) {
    alert(`لقد تفاعلت مع ${cardName}!`);
}
