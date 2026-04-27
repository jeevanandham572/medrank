import { db, auth, provider } from './firebase-config.js';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, query, where, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const collegeId = urlParams.get('id');
    const viewParam = urlParams.get('view') || 'MBBS';
    let selectedSpeciality = 'General Medicine';

    if (!collegeId) {
        window.location.href = 'colleges.html';
        return;
    }

    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    
    // UI Elements
    const pgContainer = document.getElementById('pg-speciality-container');
    const pgSelect = document.getElementById('pg-speciality-select');
    
    if (viewParam === 'Residency') {
        pgContainer.classList.remove('hidden');
        pgSelect.addEventListener('change', (e) => {
            selectedSpeciality = e.target.value;
            renderReviews();
        });
    }
    
    // UI Elements
    const elName = document.getElementById('c-name');
    const elLocation = document.getElementById('c-location');
    const elType = document.getElementById('c-type');
    const elRating = document.getElementById('c-rating');
    const elReviewsCount = document.getElementById('c-reviews-count');
    const reviewsList = document.getElementById('reviews-list');
    const noReviews = document.getElementById('no-reviews');

    // Fetch College Info
    try {
        const docRef = doc(db, "colleges", collegeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            elName.textContent = data.name;
            elLocation.textContent = data.location;
            elType.textContent = viewParam === 'Residency' ? 'Residency (PG)' : 'MBBS';
            
            // SEO Tags Update
            document.title = `${data.name} Reviews & Rankings - MedRank`;
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = "description";
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = `Read verified student and doctor reviews for ${data.name} located in ${data.location}. Check the overall rank, infrastructure, and teaching quality.`;
            
            // Open Graph tags for WhatsApp/Twitter sharing
            let ogTitle = document.createElement('meta');
            ogTitle.setAttribute('property', 'og:title');
            ogTitle.content = document.title;
            document.head.appendChild(ogTitle);
        } else {
            alert("College not found!");
            window.location.href = 'colleges.html';
        }
    } catch (error) {
        console.error("Error fetching college:", error);
        loading.innerHTML = `
            <div class="text-red-500 flex flex-col items-center p-8 bg-red-50 rounded-2xl max-w-lg mx-auto border border-red-100">
                <i class="fa-solid fa-triangle-exclamation text-5xl mb-4"></i>
                <h3 class="text-xl font-bold mb-2 text-red-700">Database Connection Failed</h3>
                <p class="text-center text-red-600">Please make sure you have added your Firebase configuration in <strong>firebase-config.js</strong>.</p>
            </div>
        `;
        return;
    }

    // Real-time listener for reviews
    const qReviews = query(
        collection(db, "reviews"), 
        where("collegeId", "==", collegeId)
    );

    let allReviews = [];

    onSnapshot(qReviews, (snapshot) => {
        loading.classList.add('hidden');
        content.classList.remove('hidden');

        allReviews = [];
        snapshot.forEach(doc => {
            allReviews.push({ id: doc.id, ...doc.data() });
        });

        // Sort by timestamp descending
        allReviews.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        
        renderReviews();
    });

    window.renderReviews = function() {
        let displayReviews = allReviews;

        if (viewParam === 'Residency') {
            displayReviews = allReviews.filter(r => r.viewType === 'Residency' && r.speciality === selectedSpeciality);
        } else {
            displayReviews = allReviews.filter(r => !r.viewType || r.viewType === 'MBBS');
        }

        let totalOverall = 0;
        displayReviews.forEach(r => totalOverall += r.overallRating);

        const avg = displayReviews.length > 0 ? (totalOverall / displayReviews.length) : 0;
        elRating.textContent = avg > 0 ? avg.toFixed(1) : '0.0';
        elReviewsCount.textContent = displayReviews.length;

        reviewsList.innerHTML = '';
        if (displayReviews.length === 0) {
            noReviews.classList.remove('hidden');
        } else {
            noReviews.classList.add('hidden');
            
            // Sort: Put the logged-in user's review at the very top
            if (auth.currentUser) {
                displayReviews.sort((a, b) => {
                    if (a.authorId === auth.currentUser.uid && b.authorId !== auth.currentUser.uid) return -1;
                    if (a.authorId !== auth.currentUser.uid && b.authorId === auth.currentUser.uid) return 1;
                    return 0;
                });
            }
            
            displayReviews.forEach(review => {
                const dateStr = review.createdAt ? review.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Just now';
                
                const card = document.createElement('div');
                card.className = "bg-white p-6 rounded-3xl shadow-sm border border-slate-100 fade-in hover:shadow-md transition-shadow";
                
                const renderStars = (rating) => {
                    let html = '';
                    for(let i=1; i<=5; i++) {
                        html += `<i class="fa-solid fa-star ${i <= rating ? 'text-yellow-400 drop-shadow-sm' : 'text-slate-200'} text-xs"></i>`;
                    }
                    return html;
                };

                let specialityTag = viewParam === 'Residency' ? `<span class="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-lg border border-teal-100 ml-2">${review.speciality}</span>` : '';
                
                const upvotesCount = review.upvotes ? review.upvotes.length : 0;
                const hasUpvoted = auth.currentUser && review.upvotes && review.upvotes.includes(auth.currentUser.uid);
                const isMyReview = auth.currentUser && review.authorId === auth.currentUser.uid;

                let deleteBtnHtml = isMyReview ? `
                    <button class="delete-own-review-btn text-xs font-bold px-2 py-1 rounded-md transition-colors bg-red-50 text-red-600 hover:bg-red-100" data-id="${review.id}" title="Delete your review">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                ` : '';

                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <img src="${review.authorPhoto || 'https://www.svgrepo.com/show/499664/user.svg'}" class="w-10 h-10 rounded-full border border-slate-200">
                            <div>
                                <div class="font-bold text-slate-800 text-sm flex items-center">
                                    ${review.authorName || 'Anonymous User'} 
                                    ${isMyReview ? '<span class="ml-2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">You</span>' : ''}
                                    ${specialityTag}
                                </div>
                                <div class="text-[11px] text-slate-400 font-medium">${dateStr}</div>
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-2">
                            <div class="flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100 shadow-sm">
                                <span class="font-bold text-slate-800">${review.overallRating}</span>
                                <i class="fa-solid fa-star text-yellow-500 text-sm drop-shadow-sm"></i>
                            </div>
                            <div class="flex gap-2">
                                ${deleteBtnHtml}
                                <button class="upvote-btn text-xs font-bold px-2 py-1 rounded-md transition-colors ${hasUpvoted ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}" data-id="${review.id}">
                                    <i class="fa-solid fa-thumbs-up"></i> ${upvotesCount}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <p class="text-slate-700 leading-relaxed mb-6 font-medium">"${review.comment}"</p>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-slate-50">
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div class="text-xs font-semibold text-slate-500 mb-1.5">Teaching</div>
                            <div class="flex gap-0.5">${renderStars(review.teaching)}</div>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div class="text-xs font-semibold text-slate-500 mb-1.5">Infrastructure</div>
                            <div class="flex gap-0.5">${renderStars(review.infrastructure)}</div>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div class="text-xs font-semibold text-slate-500 mb-1.5">Patient Load</div>
                            <div class="flex gap-0.5">${renderStars(review.patientLoad)}</div>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div class="text-xs font-semibold text-slate-500 mb-1.5">Hostel & Food</div>
                            <div class="flex gap-0.5">${renderStars(review.hostel)}</div>
                        </div>
                    </div>
                `;
                reviewsList.appendChild(card);
            });

            // Attach Upvote Listeners
            document.querySelectorAll('.upvote-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!auth.currentUser) {
                        alert("Please login to upvote reviews!");
                        return;
                    }
                    const revId = e.currentTarget.dataset.id;
                    const reviewRef = doc(db, "reviews", revId);
                    
                    const reviewData = allReviews.find(r => r.id === revId);
                    const isUpvoted = reviewData.upvotes && reviewData.upvotes.includes(auth.currentUser.uid);
                    
                    try {
                        if (isUpvoted) {
                            await updateDoc(reviewRef, { upvotes: arrayRemove(auth.currentUser.uid) });
                        } else {
                            await updateDoc(reviewRef, { upvotes: arrayUnion(auth.currentUser.uid) });
                        }
                    } catch(err) {
                        console.error("Error upvoting:", err);
                    }
                });
            });

            // Attach Delete Listeners for own reviews
            document.querySelectorAll('.delete-own-review-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (confirm("Are you sure you want to delete your review? This cannot be undone.")) {
                        const revId = e.currentTarget.dataset.id;
                        try {
                            await deleteDoc(doc(db, "reviews", revId));
                            alert("Review deleted successfully.");
                        } catch(err) {
                            console.error("Error deleting:", err);
                            alert("Failed to delete review.");
                        }
                    }
                });
            });
        }
    };

    // Form Auth State Handling
    onAuthStateChanged(auth, (user) => {
        const form = document.getElementById('review-form');
        const prompt = document.getElementById('login-prompt');
        if (user) {
            form.classList.remove('hidden');
            prompt.classList.add('hidden');
        } else {
            form.classList.add('hidden');
            prompt.classList.remove('hidden');
        }
        // Re-render reviews to update upvote button states
        renderReviews();
    });

    // Inline login button for form
    const inlineLoginBtn = document.getElementById('inline-login-btn');
    if(inlineLoginBtn) {
        inlineLoginBtn.addEventListener('click', () => {
            signInWithPopup(auth, provider).catch(err => console.error(err));
        });
    }

    // Review Form Logic
    const reviewForm = document.getElementById('review-form');
    const ratingState = {
        teaching: 0,
        infrastructure: 0,
        patientLoad: 0,
        hostel: 0,
        overallRating: 0
    };

    // Handle Star Clicks
    document.querySelectorAll('.rating-group').forEach(group => {
        const category = group.dataset.category;
        const stars = group.querySelectorAll('.star-btn');
        const valDisplay = group.querySelector('.val');

        stars.forEach(star => {
            // Hover effect
            star.addEventListener('mouseover', function() {
                const val = parseInt(this.dataset.val);
                stars.forEach(s => {
                    if (parseInt(s.dataset.val) <= val) {
                        s.classList.add(category === 'overallRating' ? 'text-yellow-400' : 'text-teal-400');
                        s.classList.remove(category === 'overallRating' ? 'text-slate-200' : 'text-slate-200');
                    } else {
                        s.classList.remove(category === 'overallRating' ? 'text-yellow-400' : 'text-teal-400', 'text-teal-500');
                        s.classList.add(category === 'overallRating' ? 'text-slate-200' : 'text-slate-200');
                    }
                });
            });

            // Mouseout effect (reset to selected)
            star.addEventListener('mouseout', function() {
                const selectedVal = ratingState[category];
                stars.forEach(s => {
                    if (parseInt(s.dataset.val) <= selectedVal) {
                        s.classList.add(category === 'overallRating' ? 'text-yellow-400' : 'text-teal-500');
                        s.classList.remove(category === 'overallRating' ? 'text-slate-200' : 'text-slate-200', 'text-teal-400');
                    } else {
                        s.classList.remove('text-yellow-400', 'text-teal-400', 'text-teal-500');
                        s.classList.add(category === 'overallRating' ? 'text-slate-200' : 'text-slate-200');
                    }
                });
            });

            // Click to select
            star.addEventListener('click', function() {
                const val = parseInt(this.dataset.val);
                ratingState[category] = val;
                valDisplay.textContent = `${val}/5`;
                // Trigger mouseout to lock colors
                this.dispatchEvent(new Event('mouseout'));
            });
        });
    });

    // Handle Submit
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('form-error');
        const successEl = document.getElementById('form-success');
        const submitBtn = document.getElementById('submit-btn');
        const comment = document.getElementById('comment').value.trim();

        // Validate
        for (const key in ratingState) {
            if (ratingState[key] === 0) {
                errorEl.textContent = "Please provide ratings for all categories.";
                errorEl.classList.remove('hidden');
                return;
            }
        }
        if (comment.length < 10) {
            errorEl.textContent = "Please write a more detailed comment (at least 10 characters).";
            errorEl.classList.remove('hidden');
            return;
        }

        errorEl.classList.add('hidden');
        
        const isAnonymous = document.getElementById('anonymous-toggle').checked;
        const submitName = isAnonymous ? "Anonymous Verified Student" : auth.currentUser.displayName;
        const submitPhoto = isAnonymous ? null : auth.currentUser.photoURL;

        const btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            await addDoc(collection(db, "reviews"), {
                collegeId: collegeId,
                authorId: auth.currentUser.uid,
                authorName: submitName,
                authorPhoto: submitPhoto,
                viewType: viewParam,
                speciality: viewParam === 'Residency' ? selectedSpeciality : null,
                teaching: ratingState.teaching,
                infrastructure: ratingState.infrastructure,
                patientLoad: ratingState.patientLoad,
                hostel: ratingState.hostel,
                overallRating: ratingState.overallRating,
                comment: comment,
                upvotes: [],
                createdAt: serverTimestamp()
            });

            // Reset form
            reviewForm.reset();
            for (const key in ratingState) {
                ratingState[key] = 0;
            }
            document.querySelectorAll('.val').forEach(el => el.textContent = '0/5');
            document.querySelectorAll('.star-btn').forEach(s => {
                s.classList.remove('text-yellow-400', 'text-teal-500');
                s.classList.add('text-slate-200');
            });

            successEl.classList.remove('hidden');
            setTimeout(() => successEl.classList.add('hidden'), 5000);
            
        } catch (error) {
            console.error("Error adding review: ", error);
            errorEl.textContent = "Failed to submit review. Check Firebase settings and permissions.";
            errorEl.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Submit Review</span> <i class="fa-solid fa-paper-plane text-sm"></i>';
        }
    });
});
