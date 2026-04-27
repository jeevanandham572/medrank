import { db, auth } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// Change this to your email
const ADMIN_EMAIL = 'jeevstechnology@gmail.com'; 

document.addEventListener('DOMContentLoaded', () => {
    // Tabs Logic
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => { t.classList.remove('bg-slate-800', 'text-white'); t.classList.add('bg-white', 'text-slate-700'); });
            tab.classList.remove('bg-white', 'text-slate-700');
            tab.classList.add('bg-slate-800', 'text-white');

            contents.forEach(c => c.classList.add('hidden'));
            document.getElementById(tab.dataset.target).classList.remove('hidden');
        });
    });

    onAuthStateChanged(auth, (user) => {
        // Quick frontend check (Requires Firestore Rules for actual backend security)
        if (user && user.email === ADMIN_EMAIL) { 
            document.getElementById('admin-content').classList.remove('hidden');
            loadQueries();
            loadReviews();
        } else {
            document.getElementById('access-denied').classList.remove('hidden');
            document.getElementById('admin-content').classList.add('hidden');
        }
    });
});

function loadQueries() {
    const q = query(collection(db, "queries"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('queries-list');
        list.innerHTML = '';
        if(snapshot.empty) {
            document.getElementById('no-queries').classList.remove('hidden');
            return;
        }
        document.getElementById('no-queries').classList.add('hidden');

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Just now';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 text-slate-500">${dateStr}</td>
                <td class="p-4 font-bold text-slate-800">${data.name}</td>
                <td class="p-4"><a href="mailto:${data.email}" class="text-teal-600 hover:underline">${data.email}</a></td>
                <td class="p-4 text-slate-600">${data.message}</td>
                <td class="p-4 text-right">
                    <button class="delete-query-btn text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" data-id="${docSnap.id}" title="Delete Message">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            list.appendChild(tr);
        });

        // Delete handlers
        document.querySelectorAll('.delete-query-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm("Delete this message?")) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        await deleteDoc(doc(db, "queries", id));
                    } catch(err) {
                        console.error("Error deleting:", err);
                        alert("Failed to delete. Check Firestore rules.");
                    }
                }
            });
        });
    });
}

function loadReviews() {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('reviews-list');
        list.innerHTML = '';
        if(snapshot.empty) {
            document.getElementById('no-reviews').classList.remove('hidden');
            return;
        }
        document.getElementById('no-reviews').classList.add('hidden');

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Just now';
            
            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-bold text-slate-800 text-sm">${data.authorName || 'Anonymous'}</div>
                        <div class="text-[11px] text-slate-400 font-medium">${dateStr}</div>
                    </div>
                    <div class="bg-yellow-50 px-2 py-1 rounded text-xs font-bold border border-yellow-100 flex items-center gap-1">
                        ${data.overallRating} <i class="fa-solid fa-star text-yellow-500"></i>
                    </div>
                </div>
                <div class="text-xs text-slate-500 mb-2 font-medium bg-slate-50 p-2 rounded border border-slate-100">
                    College ID: <a href="college.html?id=${data.collegeId}" class="text-teal-600 hover:underline break-all" target="_blank">${data.collegeId}</a>
                </div>
                <p class="text-sm text-slate-700 flex-grow mb-4 line-clamp-3">${data.comment}</p>
                
                <div class="mt-auto border-t border-slate-100 pt-3 flex justify-between items-center">
                    <span class="text-xs text-slate-400 font-medium">${data.upvotes?.length || 0} Upvotes</span>
                    <button class="delete-review-btn text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors" data-id="${docSnap.id}">
                        <i class="fa-solid fa-trash mr-1"></i> Delete Spam
                    </button>
                </div>
            `;
            list.appendChild(card);
        });

        // Delete handlers
        document.querySelectorAll('.delete-review-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm("Delete this review forever?")) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        await deleteDoc(doc(db, "reviews", id));
                    } catch(err) {
                        console.error("Error deleting:", err);
                        alert("Failed to delete. Check Firestore rules.");
                    }
                }
            });
        });
    });
}
