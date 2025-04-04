        // Global variables
        let allAnime = [];
        let currentPage = 1;
        const itemsPerPage = 24;
        const apiBaseUrl = 'https://api.jikan.moe/v4/anime';
        const loadingScreen = document.getElementById('loadingScreen');
        const animeContainer = document.getElementById('animeContainer');
        const paginationContainer = document.getElementById('pagination');
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const typeFilter = document.getElementById('typeFilter');
        const statusFilter = document.getElementById('statusFilter');
        const sortFilter = document.getElementById('sortFilter');
        const animeModal = document.getElementById('animeModal');
        const closeModal = document.getElementById('closeModal');
        const animeDetails = document.getElementById('animeDetails');

        // Function to fetch anime from API
        async function fetchAnime(page = 1) {
            showLoading();
            
            // Construct URL with parameters
            let url = `${apiBaseUrl}?page=${page}&limit=${itemsPerPage}`;
            
            // Add search term if exists
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                url += `&q=${encodeURIComponent(searchTerm)}`;
            }
            
            // Add filters if selected
            const typeValue = typeFilter.value;
            if (typeValue) {
                url += `&type=${encodeURIComponent(typeValue)}`;
            }
            
            const statusValue = statusFilter.value;
            if (statusValue) {
                url += `&status=${encodeURIComponent(statusValue)}`;
            }
            
            // Add sorting
            const sortValue = sortFilter.value;
            if (sortValue) {
                url += `&order_by=${encodeURIComponent(sortValue)}&sort=desc`;
            }
            
            try {
                // The Jikan API has rate limiting, so we'll add a small delay
                // to avoid exceeding the rate limit
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                allAnime = data.data || [];
                
                // Get pagination info
                const pagination = data.pagination || { 
                    current_page: 1, 
                    last_visible_page: 1 
                };
                
                // Display anime and pagination
                displayAnime(allAnime);
                displayPagination(pagination);
            } catch (error) {
                console.error('Error fetching anime:', error);
                animeContainer.innerHTML = '<p class="no-results">Failed to load anime. Please try again later.</p>';
                paginationContainer.innerHTML = '';
            } finally {
                hideLoading();
            }
        }

        // Function to display anime
        function displayAnime(animeList) {
            if (animeList.length === 0) {
                animeContainer.innerHTML = '<p class="no-results">No anime found. Try a different search.</p>';
                return;
            }

            animeContainer.innerHTML = '';
            animeList.forEach(anime => {
                const card = document.createElement('div');
                card.className = 'anime-card';
                
                // Default image if not available
                const imageUrl = anime.images?.jpg?.image_url || '/api/placeholder/280/380';
                
                // Get year from date if available
                let year = 'Unknown';
                if (anime.aired?.from) {
                    const dateObj = new Date(anime.aired.from);
                    if (!isNaN(dateObj.getFullYear())) {
                        year = dateObj.getFullYear();
                    }
                }
                
                // Get up to 3 genres
                const genres = anime.genres?.slice(0, 3).map(g => g.name) || [];
                const genreHtml = genres.map(genre => 
                    `<span class="anime-tag">${genre}</span>`
                ).join('');
                
                card.innerHTML = `
                    <img src="${imageUrl}" alt="${anime.title}" class="anime-image">
                    <div class="anime-content">
                        <h2 class="anime-title">${anime.title}</h2>
                        <div class="anime-info">
                            <div class="anime-rating">
                                <span class="rating-star">★</span>
                                ${anime.score ? anime.score.toFixed(1) : 'N/A'}
                            </div>
                            <div class="anime-year">${year} · ${anime.type || 'Unknown'}</div>
                        </div>
                        <div class="anime-tags">
                            ${genreHtml}
                        </div>
                        <button class="view-button" data-id="${anime.mal_id}">View Details</button>
                    </div>
                `;
                animeContainer.appendChild(card);
            });

            // Add event listeners to view buttons
            document.querySelectorAll('.view-button').forEach(button => {
                button.addEventListener('click', function() {
                    const animeId = this.getAttribute('data-id');
                    openAnimeModal(animeId);
                });
            });
        }

        // Function to display pagination
        function displayPagination(paginationInfo) {
            const totalPages = paginationInfo.last_visible_page || 1;
            currentPage = paginationInfo.current_page || 1;
            
            paginationContainer.innerHTML = '';
            
            // Previous button
            if (currentPage > 1) {
                const prevButton = document.createElement('button');
                prevButton.className = 'pagination-button';
                prevButton.textContent = '← Prev';
                prevButton.addEventListener('click', () => {
                    fetchAnime(currentPage - 1);
                });
                paginationContainer.appendChild(prevButton);
            }
            
            // Page number buttons
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement('button');
                pageButton.className = 'pagination-button';
                if (i === currentPage) {
                    pageButton.classList.add('active');
                }
                pageButton.textContent = i;
                pageButton.addEventListener('click', () => {
                    if (i !== currentPage) {
                        fetchAnime(i);
                    }
                });
                paginationContainer.appendChild(pageButton);
            }
            
            // Next button
            if (currentPage < totalPages) {
                const nextButton = document.createElement('button');
                nextButton.className = 'pagination-button';
                nextButton.textContent = 'Next →';
                nextButton.addEventListener('click', () => {
                    fetchAnime(currentPage + 1);
                });
                paginationContainer.appendChild(nextButton);
            }
        }

        // Function to open anime modal
        async function openAnimeModal(animeId) {
            showLoading();
            
            try {
                // Fetch full anime details
                const response = await fetch(`${apiBaseUrl}/${animeId}/full`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch anime details');
                }
                
                const data = await response.json();
                const anime = data.data;
                
                if (anime) {
                    // Format genres as pills
                    const genresHtml = anime.genres?.map(genre => 
                        `<span class="genre-pill">${genre.name}</span>`
                    ).join('') || 'No genres listed';
                    
                    // Format studios
                    const studios = anime.studios?.map(studio => studio.name).join(', ') || 'Unknown';
                    
                    // Format aired dates
                    let airedDates = 'Unknown';
                    if (anime.aired?.from) {
                        const fromDate = new Date(anime.aired.from).toLocaleDateString();
                        const toDate = anime.aired.to 
                            ? new Date(anime.aired.to).toLocaleDateString() 
                            : 'Present';
                        airedDates = `${fromDate} to ${toDate}`;
                    }
                    
                    animeDetails.innerHTML = `
                        <div class="modal-header">
                            <img src="${anime.images?.jpg?.large_image_url || '/api/placeholder/250/350'}" alt="${anime.title}" class="modal-image">
                            <div class="modal-info">
                                <h2 class="modal-title">${anime.title}</h2>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <span class="info-label">Type:</span> ${anime.type || 'Unknown'}
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Episodes:</span> ${anime.episodes || 'Unknown'}
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Status:</span> ${anime.status || 'Unknown'}
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Aired:</span> ${airedDates}
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Duration:</span> ${anime.duration || 'Unknown'}
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Rating:</span> ${anime.rating || 'Unknown'}
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Score:</span> ${anime.score ? `${anime.score} (${anime.scored_by} votes)` : 'N/A'}
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Rank:</span> ${anime.rank ? `#${anime.rank}` : 'N/A'}
                                    </div>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Studios:</span> ${studios}
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Genres:</span>
                                    <div class="genre-pills">
                                        ${genresHtml}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-section">
                            <h3 class="modal-section-title">Synopsis</h3>
                            <p class="synopsis">${anime.synopsis || 'No synopsis available.'}</p>
                        </div>
                        ${anime.background ? `
                        <div class="modal-section">
                            <h3 class="modal-section-title">Background</h3>
                            <p class="synopsis">${anime.background}</p>
                        </div>
                        ` : ''}
                    `;
                    
                    animeModal.style.display = 'block';
                } else {
                    animeDetails.innerHTML = '<p>Anime details not found.</p>';
                    animeModal.style.display = 'block';
                }
            } catch (error) {
                console.error('Error fetching anime details:', error);
                animeDetails.innerHTML = '<p>Failed to load anime details. Please try again later.</p>';
                animeModal.style.display = 'block';
            } finally {
                hideLoading();
            }
        }

        // Show loading screen
        function showLoading() {
            loadingScreen.style.display = 'flex';
        }

        // Hide loading screen
        function hideLoading() {
            // Add a small delay to make the loading screen visible for a minimum time
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 800);
        }

        // Event Listeners
        document.addEventListener('DOMContentLoaded', () => fetchAnime(1));
        
        searchButton.addEventListener('click', () => {
            fetchAnime(1); // Reset to page 1 when searching
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                fetchAnime(1); // Reset to page 1 when searching
            }
        });
        
        typeFilter.addEventListener('change', () => fetchAnime(1));
        statusFilter.addEventListener('change', () => fetchAnime(1));
        sortFilter.addEventListener('change', () => fetchAnime(1));
        
        closeModal.addEventListener('click', function() {
            animeModal.style.display = 'none';
        });
        
        // Close modal when clicking outside of it
        window.addEventListener('click', function(event) {
            if (event.target === animeModal) {
                animeModal.style.display = 'none';
            }
        });

        // Handle API rate limiting
        let lastFetchTime = 0;
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const currentTime = Date.now();
            const timeSinceLastFetch = currentTime - lastFetchTime;
            
            // If less than 1 second has passed since the last API call, delay
            if (timeSinceLastFetch < 1000 && args[0].includes('api.jikan.moe')) {
                await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastFetch));
            }
            
            lastFetchTime = Date.now();
            return originalFetch.apply(this, args);
        };