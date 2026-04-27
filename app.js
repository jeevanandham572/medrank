import { db } from './firebase-config.js';
import { collection, addDoc, query, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// We will fetch data from college-data.json instead of hardcoding

document.addEventListener('DOMContentLoaded', async () => {
    // Only run logic on the colleges page
    if (!document.getElementById('colleges-grid')) return;

    const grid = document.getElementById('colleges-grid');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const seedBtn = document.getElementById('seed-btn');
    const sortSelect = document.getElementById('sort-select');
    const totalCount = document.getElementById('total-count');

    let allColleges = [];
    let allReviews = [];
    let currentFilter = 'All'; // All, MBBS, Residency
    let searchQuery = '';
    let currentSort = 'rating-desc';
    let currentState = 'All';

    // Check URL params for initial filter
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam && (typeParam === 'MBBS' || typeParam === 'Residency')) {
        currentFilter = typeParam;
        filterBtns.forEach(btn => {
            if(btn.dataset.type === typeParam) {
                btn.classList.replace('bg-white', 'bg-teal-600');
                btn.classList.replace('text-slate-600', 'text-white');
            } else {
                btn.classList.replace('bg-teal-600', 'bg-white');
                btn.classList.replace('text-white', 'text-slate-600');
            }
        });
    }

    // Seed Data Setup
    if (seedBtn) {
        seedBtn.addEventListener('click', async () => {
            if(confirm("This will add all 823 colleges from the JSON database to your Firebase. This might take a minute. Proceed?")) {
                seedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Seeding 823 Colleges...</span>';
                seedBtn.disabled = true;
                try {
                    // Fetch the local JSON file
                    const response = await fetch('college-data.json');
                    const jsonData = await response.json();
                    const collegesToSeed = jsonData.colleges;
                    
                    let count = 0;
                    // Seed sequentially
                    for (let c of collegesToSeed) {
                        await addDoc(collection(db, "colleges"), {
                            name: c.college_name || "Unknown College",
                            location: c.state || "Unknown Location",
                            type: c.course || "MBBS",
                            createdAt: serverTimestamp()
                        });
                        count++;
                        if (count % 25 === 0) {
                            seedBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Seeded ${count}...</span>`;
                        }
                    }
                    alert("All colleges seeded successfully! Refreshing...");
                    window.location.reload();
                } catch(e) {
                    console.error(e);
                    alert("Error seeding data. Check console.");
                    seedBtn.disabled = false;
                    seedBtn.innerHTML = '<i class="fa-solid fa-database group-hover:scale-110 transition-transform"></i> <span>Setup Initial Data</span>';
                }
            }
        });
    }

    // Real-time listener for Colleges & Reviews to compute averages dynamically
    const fetchAndRender = () => {
        // Listen to colleges
        const qColleges = query(collection(db, "colleges"));
        onSnapshot(qColleges, (collegeSnapshot) => {
            allColleges = collegeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Listen to reviews to calculate averages dynamically
            const qReviews = query(collection(db, "reviews"));
            onSnapshot(qReviews, (reviewSnapshot) => {
                allReviews = reviewSnapshot.docs.map(doc => doc.data());
                renderColleges();
            }, (error) => {
                console.error("Error fetching reviews", error);
                // Render anyway if review fails
                renderColleges();
            });
        }, (error) => {
            console.error("Error fetching colleges", error);
            loading.innerHTML = `
                <div class="text-red-500 flex flex-col items-center p-8 bg-red-50 rounded-2xl max-w-lg mx-auto border border-red-100">
                    <i class="fa-solid fa-triangle-exclamation text-5xl mb-4"></i>
                    <h3 class="text-xl font-bold mb-2 text-red-700">Database Connection Failed</h3>
                    <p class="text-center text-red-600">Please make sure you have added your Firebase configuration in <strong>firebase-config.js</strong>.</p>
                </div>
            `;
        });
    };

    const renderColleges = () => {
        loading.classList.add('hidden');
        
        let displayType = currentFilter === 'All' ? 'MBBS' : currentFilter;

        // Calculate averages based on current view
        let processedColleges = allColleges.map(college => {
            const collegeReviews = allReviews.filter(r => r.collegeId === college.id && (currentFilter === 'All' || r.viewType === currentFilter));
            const totalReviews = collegeReviews.length;
            const sumRating = collegeReviews.reduce((sum, r) => sum + r.overallRating, 0);
            const avgRating = totalReviews > 0 ? (sumRating / totalReviews) : 0;
            return { ...college, avgRating, totalReviews };
        });

        // Apply Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            processedColleges = processedColleges.filter(c => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
        }

        // Apply State Filter
        if (currentState !== 'All') {
            processedColleges = processedColleges.filter(c => c.location.includes(currentState));
        }

        // Apply Sorting
        processedColleges.sort((a, b) => {
            if (currentSort === 'rating-desc') return b.avgRating - a.avgRating;
            if (currentSort === 'rating-asc') return a.avgRating - b.avgRating;
            if (currentSort === 'name-asc') return a.name.localeCompare(b.name);
            if (currentSort === 'name-desc') return b.name.localeCompare(a.name);
            return 0;
        });

        // Update Total Count
        if (totalCount) {
            totalCount.textContent = processedColleges.length;
        }

        grid.innerHTML = '';
        if (processedColleges.length === 0) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
        } else {
            grid.classList.remove('hidden');
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');

            processedColleges.forEach((college, index) => {
                const card = document.createElement('a');
                card.href = `college.html?id=${college.id}&view=${displayType}`;
                card.className = "bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-teal-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col fade-in h-full relative overflow-hidden";
                card.style.animationDelay = `${index * 0.05}s`;

                // Badge for Serial Number
                let badgeClass = 'bg-slate-200 text-slate-700';
                if (currentSort.includes('rating') && index === 0) badgeClass = 'bg-yellow-400 text-white';
                else if (currentSort.includes('rating') && index === 1) badgeClass = 'bg-slate-300 text-slate-700';
                else if (currentSort.includes('rating') && index === 2) badgeClass = 'bg-amber-600 text-white';
                
                let badgeHTML = `<div class="absolute top-0 right-0 ${badgeClass} text-[10px] font-bold px-3 py-1.5 rounded-bl-xl shadow-sm flex items-center gap-1 uppercase tracking-wider" title="Rank based on average user rating">
                    <span class="opacity-80">Rank</span> #${index + 1}
                </div>`;

                card.innerHTML = `
                    ${badgeHTML}
                    <div class="flex justify-between items-start mb-4">
                        <span class="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-full group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">${displayType}</span>
                        <div class="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100 shadow-sm group-hover:bg-yellow-100 transition-colors">
                            <span class="font-bold text-slate-800">${college.avgRating > 0 ? college.avgRating.toFixed(1) : 'New'}</span>
                            <i class="fa-solid fa-star text-yellow-500 text-sm drop-shadow-sm"></i>
                        </div>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3 leading-tight group-hover:text-teal-600 transition-colors">${college.name}</h3>
                    <p class="text-slate-500 text-sm flex items-start gap-2 mt-auto pt-4 border-t border-slate-50">
                        <i class="fa-solid fa-location-dot mt-0.5 text-slate-400"></i> ${college.location}
                    </p>
                    <div class="text-xs text-slate-400 mt-4 font-medium flex items-center justify-between">
                        <span>Based on ${college.totalReviews} review${college.totalReviews !== 1 ? 's' : ''}</span>
                        <span class="text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">View <i class="fa-solid fa-arrow-right text-[10px]"></i></span>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    };

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderColleges();
        });
    }

    const stateSelect = document.getElementById('state-select');
    if (stateSelect) {
        stateSelect.addEventListener('change', (e) => {
            currentState = e.target.value;
            renderColleges();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderColleges();
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.type;
            
            // Update UI
            filterBtns.forEach(b => {
                b.classList.replace('bg-teal-600', 'bg-white');
                b.classList.replace('text-white', 'text-slate-600');
            });
            e.target.classList.replace('bg-white', 'bg-teal-600');
            e.target.classList.replace('text-slate-600', 'text-white');
            
            renderColleges();
        });
    });

    fetchAndRender();
});
