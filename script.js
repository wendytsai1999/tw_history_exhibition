// ===== 應用狀態管理 =====
const AppState = {
    database: {},
    carousels: {
        'dragon-boat': { currentIndex: 0, years: [], data: {} },
        'mid-autumn': { currentIndex: 0, years: [], data: {} }
    },
    currentSection: '',
    currentFilter: ''
};

// ===== 工具函數 =====
const Utils = {
    getTextContent: (parent, selector) => {
        const element = parent.querySelector(selector);
        return element?.textContent?.trim() || '';
    },

    generateId: () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    needsExpandButton: (content) => content && content.length > 200
};

// ===== 數據解析模組 =====
const DataParser = {
    parseAll() {
        const data = {
            'special-days': {
                title: '這一天的報紙',
                filters: ['傳統節日', '歷史事件'],
                festivals: {},
                allItems: []
            },
            'advertisements': {
                title: '有趣的廣告',
                filters: ['民生用品', '汽車', '藥品'],
                items: []
            },
            'constructions': {
                title: '重要建設',
                categories: ['水利建設', '交通建設', '教育建設'],
                items: []
            },
            'daily-life': {
                title: '生活萬象',
                filters: ['經濟', '交通', '天氣'],
                items: []
            }
        };

        this.parseSpecialDays(data['special-days']);
        this.parseItems('.ad-item', data['advertisements'].items);
        this.parseItems('.construction-item', data['constructions'].items);
        this.parseItems('.daily-life-item', data['daily-life'].items);

        AppState.database = data;
    },

    parseSpecialDays(specialDaysData) {
        document.querySelectorAll('.festival-data').forEach(festivalEl => {
            const category = festivalEl.dataset.category;
            const type = festivalEl.dataset.type;
            const name = Utils.getTextContent(festivalEl, '.festival-title');

            if (type === 'carousel') {
                const yearElements = festivalEl.querySelectorAll('.year-item');
                const years = [];
                const festivalData = {};

                yearElements.forEach(yearEl => {
                    const year = parseInt(yearEl.dataset.year);
                    years.push(year);
                    const itemData = this.parseItemData(yearEl);
                    itemData.festivalName = name;
                    itemData.year = year;
                    festivalData[year] = itemData;
                    specialDaysData.allItems.push(itemData);
                });

                const sortedYears = years.sort((a, b) => a - b);
                
                specialDaysData.festivals[name] = {
                    name, category, single: false,
                    years: sortedYears, data: festivalData
                };

                // 設置輪播狀態
                const carouselKey = name === '端午' ? 'dragon-boat' : 'mid-autumn';
                if (AppState.carousels[carouselKey]) {
                    AppState.carousels[carouselKey].years = sortedYears;
                    AppState.carousels[carouselKey].data = festivalData;
                }
            } else if (type === 'single') {
                const singleData = festivalEl.querySelector('.single-event-data');
                if (singleData) {
                    const itemData = this.parseItemData(singleData);
                    itemData.festivalName = name;
                    
                    specialDaysData.festivals[name] = {
                        name, category, single: true,
                        years: [], data: itemData
                    };
                    
                    specialDaysData.allItems.push(itemData);
                }
            }
        });
    },

    parseItems(selector, targetArray) {
        document.querySelectorAll(selector).forEach(el => {
            const item = this.parseItemData(el);
            if (el.dataset.year) item.year = parseInt(el.dataset.year);
            targetArray.push(item);
        });
    },

    parseItemData(element) {
        return {
            date: Utils.getTextContent(element, '.item-date'),
            edition: Utils.getTextContent(element, '.item-edition'),
            page: Utils.getTextContent(element, '.item-page'),
            title: Utils.getTextContent(element, '.item-title'),
            content: Utils.getTextContent(element, '.item-content'),
            category: Utils.getTextContent(element, '.item-category'),
            keywords: Utils.getTextContent(element, '.item-keywords'),
            imageUrl: Utils.getTextContent(element, '.item-image-url'),
            imageText: Utils.getTextContent(element, '.item-image-text'),
            tag: Utils.getTextContent(element, '.item-tag'),
            publishTime: Utils.getTextContent(element, '.item-date')
        };
    }
};

// ===== HTML 生成模組 =====
const HtmlGenerator = {
    createItem(item, options = {}) {
        if (!item) return '';
        
        const { isTimeline = false, inModal = false, hideCategory = false } = options;
        const itemId = Utils.generateId();
        
        // 版本資訊
        let editionInfo = '';
        if (item.edition && item.page) {
            editionInfo = `${item.edition} 第${item.page}版`;
        } else if (item.edition) {
            editionInfo = item.edition;
        } else if (item.page) {
            editionInfo = `第${item.page}版`;
        }

        // 圖片區塊
        const imageSection = item.imageUrl 
            ? `<img src="${item.imageUrl}" alt="${Utils.escapeHtml(item.title || '')}" onclick="ImageModal.open('${item.imageUrl}', '${Utils.escapeHtml(item.title || '')}')" loading="lazy">`
            : `<div class="no-image">${Utils.escapeHtml(item.imageText || item.title || '無圖片')}</div>`;

        // 展開按鈕
        const needsExpand = Utils.needsExpandButton(item.content);
        const displayContent = needsExpand ? item.content.substring(0, 200) + '...' : item.content;
        const expandButton = needsExpand 
            ? `<button class="expand-btn" onclick="ContentManager.toggle('${itemId}', \`${Utils.escapeHtml(item.content)}\`)">展開全文</button>`
            : '';

        if (isTimeline) {
            return `
                <div class="timeline-item">
                    <div class="timeline-year">${item.year || ''}</div>
                    <div class="timeline-content">
                        <div class="timeline-image">${imageSection}</div>
                        <div class="timeline-text">
                            ${item.date ? `<div class="item-date">${item.date}${editionInfo ? ` ${editionInfo}` : ''}</div>` : ''}
                            <div class="item-meta">
                                ${!hideCategory && item.category ? `<span class="item-category">${item.category}</span>` : ''}
                                ${item.tag ? `<span class="item-tag">${item.tag}</span>` : ''}
                            </div>
                            ${item.title ? `<h3 class="item-title">${Utils.escapeHtml(item.title)}</h3>` : ''}
                            ${item.keywords ? `<div class="item-keywords">關鍵詞：${item.keywords}</div>` : ''}
                            <div class="item-content" id="content-${itemId}">${displayContent}</div>
                            ${expandButton}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="item">
                <div class="item-image">${imageSection}</div>
                <div class="item-text">
                    ${item.date ? `<div class="item-date">${item.date}${editionInfo ? ` ${editionInfo}` : ''}</div>` : ''}
                    <div class="item-meta">
                        ${!hideCategory && item.category ? `<span class="item-category">${item.category}</span>` : ''}
                        ${item.tag ? `<span class="item-tag">${item.tag}</span>` : ''}
                    </div>
                    ${item.title ? `<h3 class="item-title">${Utils.escapeHtml(item.title)}</h3>` : ''}
                    ${item.keywords ? `<div class="item-keywords">關鍵詞：${item.keywords}</div>` : ''}
                    <div class="item-content" id="content-${itemId}">${displayContent}</div>
                    ${expandButton}
                </div>
            </div>
        `;
    },

    createCardContainer(items, options = {}) {
        const { maxItems, singleItemStyle = false } = options;
        const displayItems = maxItems ? items.slice(0, maxItems) : items;
        
        if (displayItems.length === 0) {
            return '<div class="error">暫無資料</div>';
        }

        const containerClass = singleItemStyle && displayItems.length === 1 
            ? 'card-container single-item' 
            : 'card-container';

        return `
            <div class="${containerClass}">
                ${displayItems.map(item => this.createItem(item)).join('')}
            </div>
        `;
    },

    createYearTimeline(carouselId, years, currentPageYears) {
        if (years.length <= 2) return '';
        
        return years.map((year, index) => {
            const isActive = currentPageYears && currentPageYears.includes(year);
            return `<div class="year-indicator ${isActive ? 'active' : ''}" onclick="CarouselManager.goToYear('${carouselId}', ${index})">${year}</div>`;
        }).join('');
    },

    createModalYearTimeline(carouselId, years, currentPageYears) {
        if (years.length <= 2) return '';
        
        return years.map((year, index) => {
            const isActive = currentPageYears && currentPageYears.includes(year);
            return `<div class="year-indicator ${isActive ? 'active' : ''}" onclick="CarouselManager.goToYearModal('${carouselId}', ${index})">${year}</div>`;
        }).join('');
    }
};

// ===== 輪播管理模組 =====
const CarouselManager = {
    prev(carouselId) {
        const carousel = AppState.carousels[carouselId];
        if (!carousel || carousel.years.length <= 2) return;
        
        const totalPages = Math.ceil(carousel.years.length / 2);
        const currentPage = Math.floor(carousel.currentIndex / 2);
        const newPage = (currentPage - 1 + totalPages) % totalPages;
        carousel.currentIndex = newPage * 2;
        this.updateCarousel(carouselId);
    },

    next(carouselId) {
        const carousel = AppState.carousels[carouselId];
        if (!carousel || carousel.years.length <= 2) return;
        
        const totalPages = Math.ceil(carousel.years.length / 2);
        const currentPage = Math.floor(carousel.currentIndex / 2);
        const newPage = (currentPage + 1) % totalPages;
        carousel.currentIndex = newPage * 2;
        this.updateCarousel(carouselId);
    },

    goToYear(carouselId, yearIndex) {
        const carousel = AppState.carousels[carouselId];
        if (!carousel || yearIndex < 0 || yearIndex >= carousel.years.length) return;
        
        const pageIndex = Math.floor(yearIndex / 2);
        carousel.currentIndex = pageIndex * 2;
        this.updateCarousel(carouselId);
    },

    updateCarousel(carouselId) {
        const carousel = AppState.carousels[carouselId];
        if (!carousel) return;

        const contentContainer = document.getElementById(`${carouselId}-content`);
        const timelineContainer = document.getElementById(`${carouselId}-timeline`);
        
        if (!contentContainer) return;

        // 獲取當前頁的兩個年份
        const currentPageYears = carousel.years.slice(carousel.currentIndex, carousel.currentIndex + 2);
        const currentItems = currentPageYears.map(year => carousel.data[year]).filter(item => item);
        
        if (currentItems.length === 0) {
            contentContainer.innerHTML = '<div class="error">暫無資料</div>';
        } else {
            contentContainer.innerHTML = HtmlGenerator.createCardContainer(currentItems, { 
                singleItemStyle: currentItems.length === 1 
            });
        }

        // 更新時間軸
        if (timelineContainer) {
            timelineContainer.innerHTML = HtmlGenerator.createYearTimeline(
                carouselId, carousel.years, currentPageYears
            );
        }

        this.updateNavButtons(carouselId);
    },

    updateNavButtons(carouselId) {
        const sectionId = carouselId === 'dragon-boat' ? 'dragon-boat-festival' : 'mid-autumn-festival';
        const section = document.getElementById(sectionId);
        if (!section) return;

        const prevBtn = section.querySelector('.carousel-prev');
        const nextBtn = section.querySelector('.carousel-next');
        const carousel = AppState.carousels[carouselId];
        
        if (prevBtn && nextBtn && carousel) {
            const hasMultiple = carousel.years.length > 2;
            prevBtn.disabled = !hasMultiple;
            nextBtn.disabled = !hasMultiple;
        }
    },

    // 模態輪播方法
    prevModal(carouselId) {
        const carousel = AppState.carousels[carouselId];
        if (!carousel || carousel.years.length <= 2) return;
        
        const totalPages = Math.ceil(carousel.years.length / 2);
        const currentPage = Math.floor(carousel.currentIndex / 2);
        const newPage = (currentPage - 1 + totalPages) % totalPages;
        carousel.currentIndex = newPage * 2;
        this.updateModalCarousel(carouselId);
    },

    nextModal(carouselId) {
        const carousel = AppState.carousels[carouselId];
        if (!carousel || carousel.years.length <= 2) return;
        
        const totalPages = Math.ceil(carousel.years.length / 2);
        const currentPage = Math.floor(carousel.currentIndex / 2);
        const newPage = (currentPage + 1) % totalPages;
        carousel.currentIndex = newPage * 2;
        this.updateModalCarousel(carouselId);
    },

    goToYearModal(carouselId, yearIndex) {
        const carousel = AppState.carousels[carouselId];
        if (!carousel || yearIndex < 0 || yearIndex >= carousel.years.length) return;
        
        const pageIndex = Math.floor(yearIndex / 2);
        carousel.currentIndex = pageIndex * 2;
        this.updateModalCarousel(carouselId);
    },

    updateModalCarousel(carouselId) {
        const carousel = AppState.carousels[carouselId];
        if (!carousel) return;

        const contentContainer = document.getElementById(`${carouselId}-content`);
        const timelineContainer = document.getElementById(`${carouselId}-timeline`);
        
        if (!contentContainer) return;

        const currentPageYears = carousel.years.slice(carousel.currentIndex, carousel.currentIndex + 2);
        const currentItems = currentPageYears.map(year => carousel.data[year]).filter(item => item);
        
        if (currentItems.length === 0) {
            contentContainer.innerHTML = '<div class="error">暫無資料</div>';
        } else {
            contentContainer.innerHTML = HtmlGenerator.createCardContainer(currentItems, { 
                inModal: true, singleItemStyle: currentItems.length === 1 
            });
        }

        if (timelineContainer) {
            timelineContainer.innerHTML = HtmlGenerator.createModalYearTimeline(
                carouselId, carousel.years, currentPageYears
            );
        }
    }
};

// ===== 內容管理模組 =====
const ContentManager = {
    toggle(itemId, fullContent) {
        const contentElement = document.getElementById(`content-${itemId}`);
        const button = event.target;
        
        if (!contentElement || !button) return;
        
        const isExpanded = button.textContent === '收起';
        
        if (isExpanded) {
            contentElement.innerHTML = fullContent.substring(0, 200) + '...';
            button.textContent = '展開全文';
        } else {
            contentElement.innerHTML = fullContent;
            button.textContent = '收起';
        }
    }
};

// ===== 圖片模態窗口模組 =====
const ImageModal = {
    open(imageUrl, caption) {
        if (!imageUrl) return;
        
        const modal = document.getElementById('image-modal-overlay');
        const img = document.getElementById('image-modal-img');
        const captionEl = document.getElementById('image-modal-caption');
        
        img.src = imageUrl;
        captionEl.textContent = caption || '';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const modal = document.getElementById('image-modal-overlay');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
};

// ===== 主模態窗口模組 =====
const Modal = {
    open(section, defaultCategory) {
        AppState.currentSection = section;
        const data = AppState.database[section];
        
        if (!data) {
            alert('此區塊暫無資料');
            return;
        }
        
        document.getElementById('modal-title').textContent = data.title || '查看全部';
        
        if (section === 'special-days') {
            this.setupSpecialDaysModal(data);
        } else if (section === 'constructions') {
            this.setupConstructionsModal(data, defaultCategory);
        } else {
            this.setupRegularModal(data);
        }
        
        document.getElementById('modal-overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    openCategory(section, category) {
        // 改為呼叫open，並傳入category
        this.open(section, category);
    },

    close() {
        document.getElementById('modal-overlay').classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // 清理模態輪播狀態
        Object.keys(AppState.carousels).forEach(carouselId => {
            if (carouselId.startsWith('modal-carousel-')) {
                delete AppState.carousels[carouselId];
            }
        });
    },

    setupSpecialDaysModal(data) {
        const filtersContainer = document.getElementById('modal-filters');
        filtersContainer.innerHTML = '';
        filtersContainer.style.display = 'flex';
        
        (data.filters || []).forEach((filter, index) => {
            const tag = document.createElement('div');
            tag.className = `filter-tag ${index === 0 ? 'active' : ''}`;
            tag.textContent = filter;
            tag.onclick = () => this.filterSpecialDays(filter);
            filtersContainer.appendChild(tag);
        });
        
        AppState.currentFilter = (data.filters || [])[0] || '';
        this.loadSpecialDaysContent();
    },

    setupConstructionsModal(data, defaultCategory) {
        const filtersContainer = document.getElementById('modal-filters');
        filtersContainer.innerHTML = '';
        filtersContainer.style.display = 'flex';
        
        const categories = ['all', ...(data.categories || [])];
        const filterNames = ['所有報導', ...(data.categories || [])];
        
        let selected = typeof defaultCategory === 'string' ? defaultCategory : 'all';
        // 對照filterNames與categories
        categories.forEach((category, index) => {
            const tag = document.createElement('div');
            tag.className = `filter-tag ${category === selected ? 'active' : ''}`;
            tag.textContent = filterNames[index];
            tag.onclick = () => this.filterConstructions(category);
            filtersContainer.appendChild(tag);
        });
        this.loadConstructionsContent(selected);
    },

    setupRegularModal(data) {
        const filtersContainer = document.getElementById('modal-filters');
        filtersContainer.innerHTML = '';
        filtersContainer.style.display = 'flex';
        
        (data.filters || []).forEach((filter, index) => {
            const tag = document.createElement('div');
            tag.className = `filter-tag ${index === 0 ? 'active' : ''}`;
            tag.textContent = filter;
            tag.onclick = () => this.filterRegular(filter);
            filtersContainer.appendChild(tag);
        });
        
        AppState.currentFilter = (data.filters || [])[0] || '';
        this.loadRegularContent();
    },

    filterSpecialDays(filter) {
        AppState.currentFilter = filter;
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.toggle('active', tag.textContent === filter);
        });
        this.loadSpecialDaysContent();
    },

    filterConstructions(category) {
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
        });
        event.target.classList.add('active');
        this.loadConstructionsContent(category);
    },

    filterRegular(filter) {
        AppState.currentFilter = filter;
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.toggle('active', tag.textContent === filter);
        });
        this.loadRegularContent();
    },

    loadSpecialDaysContent() {
        const container = document.getElementById('modal-items');
        const data = AppState.database['special-days'];
        
        const filteredFestivals = Object.values(data.festivals).filter(festival => 
            festival?.category === AppState.currentFilter
        );
        
        if (filteredFestivals.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">此分類暫無內容</div>';
            return;
        }
        
        let html = '';
        
        filteredFestivals.forEach(festival => {
            if (festival.single) {
                html += `
                    <div class="festival-section" id="modal-${festival.name}">
                        <div class="festival-section-header">
                            <h3 class="festival-section-title">${festival.name || ''}</h3>
                        </div>
                        <div class="festival-content">
                            ${HtmlGenerator.createItem(festival.data, { inModal: true })}
                        </div>
                    </div>
                `;
            } else {
                const modalCarouselId = `modal-carousel-${festival.name}`;
                html += `
                    <div class="festival-section" id="modal-${festival.name}">
                        <div class="festival-section-header">
                            <h3 class="festival-section-title">${festival.name || ''}</h3>
                        </div>
                        <div class="timeline-nav-row">
                            <div class="year-timeline" id="${modalCarouselId}-timeline">
                                ${HtmlGenerator.createYearTimeline(modalCarouselId, festival.years, festival.years)}
                            </div>
                            <div class="festival-controls">
                                <button class="carousel-nav carousel-prev" onclick="CarouselManager.prevModal('${modalCarouselId}')">‹</button>
                                <button class="carousel-nav carousel-next" onclick="CarouselManager.nextModal('${modalCarouselId}')">›</button>
                            </div>
                        </div>
                        <div class="festival-content" id="${modalCarouselId}-content">
                            ${HtmlGenerator.createItem(festival.data[festival.years[0]], { inModal: true })}
                        </div>
                    </div>
                `;
                
                AppState.carousels[modalCarouselId] = {
                    currentIndex: 0,
                    years: festival.years,
                    data: festival.data
                };
            }
        });
        
        container.innerHTML = html;
        
        // 初始化模態輪播
        Object.keys(AppState.carousels).forEach(carouselId => {
            if (carouselId.startsWith('modal-carousel-')) {
                CarouselManager.updateModalCarousel(carouselId);
            }
        });
    },

    loadConstructionsContent(category) {
        const container = document.getElementById('modal-items');
        const items = AppState.database['constructions'].items || [];
        
        let filteredItems = items.filter(item => item);
        
        if (category !== 'all') {
            filteredItems = filteredItems.filter(item => item.category === category);
        }
        
        if (filteredItems.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">此分類暫無建設資料</div>';
            return;
        }

        const sortedItems = filteredItems.sort((a, b) => (a.year || 0) - (b.year || 0));
        
        const timelineHTML = `
            <div class="modal-timeline">
                <div class="timeline">
                    ${sortedItems.map(item => HtmlGenerator.createItem(item, { isTimeline: true, inModal: true, hideCategory: true })).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = timelineHTML;
    },

    loadRegularContent() {
        const container = document.getElementById('modal-items');
        const data = AppState.database[AppState.currentSection] || {};
        
        const filteredItems = (data.items || []).filter(item => 
            item?.category === AppState.currentFilter
        );
        
        if (filteredItems.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #999;">此分類暫無更多內容</div>';
            return;
        }

        const sortedItems = filteredItems
            .filter(item => item.publishTime)
            .sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));
        
        container.innerHTML = HtmlGenerator.createCardContainer(sortedItems, { inModal: true });
    }
};

// ===== 渲染模組 =====
const Renderer = {
    renderSpecialDays() {
        CarouselManager.updateCarousel('dragon-boat');
        CarouselManager.updateCarousel('mid-autumn');
        this.renderSeptIncident();
    },

    renderSeptIncident() {
        const container = document.getElementById('sept-incident-content');
        const data = AppState.database['special-days'];
        
        if (!container || !data.festivals) return;
        
        const septData = data.festivals['九一八事變'];
        if (septData && septData.data) {
            container.innerHTML = HtmlGenerator.createCardContainer([septData.data], { 
                singleItemStyle: true 
            });
        } else {
            container.innerHTML = '<div class="error">暫無九一八事變資料</div>';
        }
    },

    renderSectionItems(sectionKey) {
        const section = AppState.database[sectionKey];
        const container = document.getElementById(`${sectionKey}-items`);
        
        if (!section?.items || !container) {
            if (container) container.innerHTML = '<div class="error">此區塊暫無資料</div>';
            return;
        }

        const latestItems = section.items
            .filter(item => item?.publishTime)
            .sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime))
            .slice(0, 2);

        if (latestItems.length === 0) {
            container.innerHTML = '<div class="error">此區塊暫無資料</div>';
            return;
        }

        container.innerHTML = HtmlGenerator.createCardContainer(latestItems, { 
            singleItemStyle: latestItems.length === 1 
        });
    },

    renderConstructionsTimeline(category = 'all') {
        const section = AppState.database['constructions'];
        const container = document.getElementById('constructions-timeline');
        
        if (!section?.items || !container) {
            if (container) container.innerHTML = '<div class="error">重要建設區塊暫無資料</div>';
            return;
        }
        
        let filteredItems = section.items.filter(item => item);

        if (category !== 'all') {
            filteredItems = filteredItems.filter(item => item.category === category);
        }

        if (filteredItems.length === 0) {
            container.innerHTML = '<div class="error">此分類暫無資料</div>';
            return;
        }

        // 修改：所有報導顯示5筆，分類顯示2筆
        const sortedItems = filteredItems
            .sort((a, b) => (b.year || 0) - (a.year || 0))
            .slice(0, category === 'all' ? 5 : 2);

        const timelineHTML = `
            <div class="timeline">
                ${sortedItems.map(item => HtmlGenerator.createItem(item, { isTimeline: true, hideCategory: category === 'all' })).join('')}
            </div>
            <div style="text-align:right;margin-top:1rem;">
                <button class="category-more-btn" onclick="openConstructionsMore('${category}')">more</button>
            </div>
        `;
        
        container.innerHTML = timelineHTML;
    },

    // 移除 renderCategoryTimelines
};

// ===== 事件處理模組 =====
const EventHandlers = {
    init() {
        // 導航按鈕
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', function() {
                document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const targetSection = document.getElementById(this.dataset.section);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // 建設過濾器
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
                Renderer.renderConstructionsTimeline(this.dataset.category);
            });
        });

        // 模態窗口關閉
        document.getElementById('modal-overlay').addEventListener('click', function(e) {
            if (e.target === this) Modal.close();
        });

        // 圖片模態窗口關閉
        const imageModal = document.getElementById('image-modal-overlay');
        if (imageModal) {
            imageModal.addEventListener('click', function(e) {
                if (e.target === this) ImageModal.close();
            });
        }

        // ESC 鍵關閉
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                Modal.close();
                ImageModal.close();
            }
        });

        this.initBackToTop();
    },

    initBackToTop() {
        const backToTopBtn = document.getElementById('back-to-top');
        
        if (backToTopBtn) {
            window.addEventListener('scroll', function() {
                if (window.pageYOffset > 300) {
                    backToTopBtn.classList.add('show');
                } else {
                    backToTopBtn.classList.remove('show');
                }
            });
            
            backToTopBtn.addEventListener('click', function() {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }
};

// ===== 全域函數（供HTML調用） =====
function openModal(section) { Modal.open(section); }
function openCategoryModal(section, category) { Modal.open(section, category); }
function closeModal() { Modal.close(); }
function closeImageModal() { ImageModal.close(); }
function openConstructionsMore(category) {
    Modal.open('constructions', category);
}

// 全域訪問
window.CarouselManager = CarouselManager;
window.ContentManager = ContentManager;
window.ImageModal = ImageModal;

// ===== 應用初始化 =====
const App = {
    init() {
        console.log('🎉 臺灣日日新報應用初始化中...');
        
        DataParser.parseAll();
        console.log('✅ 數據解析完成:', {
            節慶總數: Object.keys(AppState.database['special-days'].festivals).length,
            廣告數量: AppState.database['advertisements'].items.length,
            建設數量: AppState.database['constructions'].items.length,
            生活數量: AppState.database['daily-life'].items.length
        });
        
        Renderer.renderSpecialDays();
        Renderer.renderSectionItems('advertisements');
        Renderer.renderSectionItems('daily-life');
        Renderer.renderConstructionsTimeline();
        
        EventHandlers.init();
        
        console.log('🚀 臺灣日日新報應用初始化完成');
        console.log('📊 輪播狀態:', AppState.carousels);
    }
};

// ===== 頁面載入完成後初始化 =====
document.addEventListener('DOMContentLoaded', App.init);
