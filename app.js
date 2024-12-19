// اختيار العنصر الذي سيتم عرض بطاقات السائقين فيه
const container = document.querySelector(".container");

// بيانات السائقين مع روابط الصور
const drivers = [
  {
    name: "أحمد محمد",
    image: "https://firebasestorage.googleapis.com/v0/b/messageemeapp.appspot.com/o/driver-images%2F7605a607-6cf8-4b32-aee1-fa7558c98452.png?alt=media&token=5cf9e67c-ba6e-4431-a6a0-79dede15b527",
    rating: 4.8,
    trips: 150,
    carType: "تويوتا كامري",
    location: "بغداد",
    status: "متاح"
  },
  {
    name: "حسين علي",
    image: "https://firebasestorage.googleapis.com/v0/b/messageemeapp.appspot.com/o/driver-images%2F7605a607-6cf8-4b32-aee1-fa7558c98452.png?alt=media&token=5cf9e67c-ba6e-4431-a6a0-79dede15b527",
    rating: 4.9,
    trips: 200,
    carType: "هونداي سوناتا",
    location: "النجف",
    status: "مشغول"
  },
  {
    name: "علي حسن",
    image: "https://firebasestorage.googleapis.com/v0/b/messageemeapp.appspot.com/o/driver-images%2F7605a607-6cf8-4b32-aee1-fa7558c98452.png?alt=media&token=5cf9e67c-ba6e-4431-a6a0-79dede15b527",
    rating: 4.7,
    trips: 180,
    carType: "كيا K5",
    location: "كربلاء",
    status: "متاح"
  },
  // يمكن إضافة المزيد من السائقين هنا
];

// وظيفة لعرض بطاقات السائقين
const showDrivers = () => {
  let output = "";
  drivers.forEach(({ name, image, rating, trips, carType, location, status }) => {
    output += `
      <div class="driver-card animate__animated animate__fadeIn">
        <div class="driver-image-container">
          <img class="driver-image" src="${image}" alt="${name}" />
          <div class="driver-status ${status === 'متاح' ? 'status-active' : 'status-inactive'}">
            ${status}
          </div>
        </div>
        
        <div class="driver-info">
          <h3 class="driver-name">${name}</h3>
          
          <div class="driver-stats">
            <div class="stat-item">
              <div class="stat-value">
                <i class="fas fa-star" style="color: #FFD700;"></i>
                ${rating}
              </div>
              <div class="stat-label">التقييم</div>
            </div>
            
            <div class="stat-item">
              <div class="stat-value">
                <i class="fas fa-route"></i>
                ${trips}
              </div>
              <div class="stat-label">الرحلات</div>
            </div>
          </div>

          <div class="driver-details">
            <p><i class="fas fa-car"></i> ${carType}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${location}</p>
          </div>
          
          <div class="driver-actions">
            <button class="action-btn primary" onclick="viewLocation('${name}')">
              <i class="fas fa-map-marker-alt"></i>
              عرض الموقع
            </button>
            <button class="action-btn secondary" onclick="contactDriver('${name}')">
              <i class="fas fa-phone"></i>
              اتصال
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  // إضافة المحتوى إلى الحاوية
  container.innerHTML = output;
};

// تحديث حالة البطاقات كل 30 ثانية
const updateDriversStatus = () => {
  const cards = document.querySelectorAll('.driver-card');
  cards.forEach(card => {
    const statusElement = card.querySelector('.driver-status');
    if (Math.random() > 0.5) {
      statusElement.textContent = 'متاح';
      statusElement.classList.add('status-active');
      statusElement.classList.remove('status-inactive');
    } else {
      statusElement.textContent = 'مشغول';
      statusElement.classList.add('status-inactive');
      statusElement.classList.remove('status-active');
    }
  });
};

// وظائف التفاعل
const viewLocation = (driverName) => {
  showToast(`جاري عرض موقع السائق ${driverName}...`);
};

const contactDriver = (driverName) => {
  showToast(`جاري الاتصال بالسائق ${driverName}...`);
};

const showToast = (message) => {
  // إضافة توست للإشعارات
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// تنفيذ دالة العرض بعد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  showDrivers();
  setInterval(updateDriversStatus, 30000);
});