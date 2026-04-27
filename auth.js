import { auth, provider } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Check if admin
            const isAdmin = user.email === 'jeevstechnology@gmail.com'; 
            let adminBtn = isAdmin ? `<a href="admin.html" class="text-xs font-bold bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"><i class="fa-solid fa-lock text-[10px] mr-1"></i> Admin</a>` : '';
            
            authContainer.innerHTML = `
                <div class="flex items-center gap-3">
                    ${adminBtn}
                    <div class="hidden sm:block text-right mr-1">
                        <div class="text-xs font-bold text-slate-700 leading-none">${user.displayName}</div>
                        <div class="text-[10px] text-slate-400 mt-1 cursor-pointer hover:text-red-500" id="logout-text">Logout</div>
                    </div>
                    <img src="${user.photoURL}" class="w-9 h-9 rounded-full border-2 border-teal-500 shadow-sm cursor-pointer" id="logout-btn" title="Click to Logout">
                </div>
            `;
            
            document.getElementById('logout-btn').addEventListener('click', () => {
                if(confirm("Are you sure you want to logout?")) signOut(auth);
            });
            if(document.getElementById('logout-text')) {
                document.getElementById('logout-text').addEventListener('click', () => signOut(auth));
            }
        } else {
            authContainer.innerHTML = `
                <button id="login-btn" class="bg-white text-slate-700 hover:bg-slate-50 font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm border border-slate-200 shadow-sm">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-4 h-4" alt="Google"> Login
                </button>
            `;
            document.getElementById('login-btn').addEventListener('click', () => {
                signInWithPopup(auth, provider).catch(err => {
                    console.error("Login failed:", err);
                    if (err.code === 'auth/unauthorized-domain') {
                        alert("Please add 'localhost' to the Authorized Domains list in your Firebase Authentication settings!");
                    }
                });
            });
        }
    });
});
