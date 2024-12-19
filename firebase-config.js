// تكوين Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf1n1TrAzwEMiAI",
    authDomain: "messageemeapp.firebaseapp.com",
    databaseURL: "https://messageemeapp-default-rtdb.firebaseio.com",
    projectId: "messageemeapp",
    storageBucket: "messageemeapp.appspot.com",
    messagingSenderId: "255034474844",
    appId: "1:255034474844:web:5e3b7a6bc4b2fb94cc4199"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// تصدير الخدمات التي نحتاجها
const database = firebase.database();
const storage = firebase.storage();

// التحقق من حالة الاتصال
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        console.log('متصل بـ Firebase');
    } else {
        console.log('غير متصل بـ Firebase');
    }
});