let searchFilters = {
    q: '',
    category: '',
    level: '',
    min_price: '',
    max_price: '',
    sort_by: 'newest'
};

async function performAdvancedSearch() {
    try {
        const queryString = new URLSearchParams(searchFilters).toString();
        const response = await fetch(`${API_BASE}/search/courses?${queryString}`);
        const { courses } = await response.json();
        
        displaySearchResults(courses);
    } catch (error) {
        console.error('Search error:', error);
    }
}

function displaySearchResults(courses) {
    const resultsHTML = `
        <div class="search-results-container">
            <div class="search-sidebar">
                <h3>Filters</h3>
                
                <div class="filter-group">
                    <label>Category</label>
                    <select onchange="updateFilter('category', this.value)">
                        <option value="">All Categories</option>
                        <option value="Programming">Programming</option>
                        <option value="Database">Database</option>
                        <option value="Design">Design</option>
                        <option value="Business">Business</option>
                        <option value="Marketing">Marketing</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>Level</label>
                    <select onchange="updateFilter('level', this.value)">
                        <option value="">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>Price Range</label>
                    <input type="number" placeholder="Min" onchange="updateFilter('min_price', this.value)">
                    <input type="number" placeholder="Max" onchange="updateFilter('max_price', this.value)">
                </div>
                
                <button onclick="resetFilters()" class="btn-secondary">Reset Filters</button>
            </div>
            
            <div class="search-results-main">
                <div class="results-header">
                    <h2>${courses.length} courses found</h2>
                    <select onchange="updateFilter('sort_by', this.value)">
                        <option value="newest">Newest First</option>
                        <option value="popular">Most Popular</option>
                        <option value="rating">Highest Rated</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                    </select>
                </div>
                
                <div class="courses-grid">
                    ${courses.map(course => `
                        <div class="course-card-search">
                            <img src="${course.thumbnail_url || '/assets/default-course.png'}" alt="${course.title}">
                            <div class="course-card-content">
                                <span class="course-category">${course.category}</span>
                                <h3>${course.title}</h3>
                                <p class="course-instructor">By ${course.instructor_first_name} ${course.instructor_last_name}</p>
                                <div class="course-meta">
                                    <span>⭐ ${course.rating || 0}</span>
                                    <span>${course.total_students || 0} students</span>
                                    <span>${course.difficulty_level}</span>
                                </div>
                                <div class="course-card-footer">
                                    <span class="course-price">$${course.price}</span>
                                    <button onclick="viewCourseDetails(${course.id})" class="btn-primary">View Details</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('search-results-section').innerHTML = resultsHTML;
}

function updateFilter(key, value) {
    searchFilters[key] = value;
    performAdvancedSearch();
}

function resetFilters() {
    searchFilters = { q: '', category: '', level: '', min_price: '', max_price: '', sort_by: 'newest' };
    document.querySelectorAll('.search-sidebar select, .search-sidebar input').forEach(el => el.value = '');
    performAdvancedSearch();
}

// Quick search from header
function quickSearch(query) {
    searchFilters.q = query;
    showSection('search-results');
    performAdvancedSearch();
}
