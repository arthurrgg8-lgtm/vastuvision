/* ==========================================================================
   VastuVision AI - Core Client Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        selectedRoom: null,
        uploadedImages: {
            north: null,
            south: null,
            east: null,
            west: null
        },
        analysisResult: null,
        activeFilterTab: 'all'
    };

    // DOM Elements
    const step1Container = document.getElementById('step-1-container');
    const step2Container = document.getElementById('step-2-container');
    const stepLoadingContainer = document.getElementById('step-loading-container');
    const stepResultsContainer = document.getElementById('step-results-container');

    const step1Indicator = document.getElementById('step-1-indicator');
    const step2Indicator = document.getElementById('step-2-indicator');
    const step3Indicator = document.getElementById('step-3-indicator');
    const line1 = document.getElementById('line-1');
    const line2 = document.getElementById('line-2');

    const btnRoomNext = document.getElementById('btn-room-next');
    const btnUploadBack = document.getElementById('btn-upload-back');
    const btnUploadAnalyze = document.getElementById('btn-upload-analyze');
    const btnReanalyze = document.getElementById('btn-reanalyze');
    const uploadTitle = document.getElementById('upload-title');
    const loaderStatusMsg = document.getElementById('loader-status-msg');
    const progressFill = document.getElementById('analysis-progress');
    const resultsRoomTitle = document.getElementById('results-room-title');

    // Score Elements
    const scoreFill = document.getElementById('score-fill');
    const scoreText = document.getElementById('score-text');
    const scoreDescription = document.getElementById('score-description');

    // Filter Tabs
    const tabAll = document.getElementById('tab-all');
    const tabCritical = document.getElementById('tab-critical');
    const tabWarning = document.getElementById('tab-warning');
    const tabGood = document.getElementById('tab-good');

    const countAll = document.getElementById('count-all');
    const countCritical = document.getElementById('count-critical');
    const countWarning = document.getElementById('count-warning');
    const countGood = document.getElementById('count-good');

    const suggestionsListBox = document.getElementById('suggestions-list-box');

    // Floorplan Cells
    const cells = {
        north: document.getElementById('cell-north-items'),
        south: document.getElementById('cell-south-items'),
        east: document.getElementById('cell-east-items'),
        west: document.getElementById('cell-west-items')
    };

    /* ==========================================================================
       Step 1: Room Selection Handlers
       ========================================================================== */
    const roomCards = document.querySelectorAll('.room-card');
    roomCards.forEach(card => {
        card.addEventListener('click', () => {
            // Clear existing selection
            roomCards.forEach(c => c.classList.remove('selected'));
            
            // Select current card
            card.classList.add('selected');
            state.selectedRoom = card.getAttribute('data-room');
            
            // Enable button
            btnRoomNext.disabled = false;
        });
    });

    btnRoomNext.addEventListener('click', () => {
        if (!state.selectedRoom) return;

        // Transition to Step 2
        step1Container.classList.remove('active');
        step2Container.classList.add('active');

        // Update Stepper
        step1Indicator.classList.add('completed');
        step2Indicator.classList.add('active');
        line1.classList.add('filled');

        // Format upload title
        const roomNameFormatted = state.selectedRoom.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        uploadTitle.innerText = `Configure ${roomNameFormatted} Photos`;
    });

    /* ==========================================================================
       Step 2: Drag, Drop, Compress, & Upload Handlers
       ========================================================================== */
    const directions = ['north', 'south', 'east', 'west'];
    
    directions.forEach(dir => {
        const dropZone = document.getElementById(`drop-${dir}`);
        const fileInput = document.getElementById(`file-${dir}`);
        const previewContainer = dropZone.querySelector('.preview-container');
        const previewImg = dropZone.querySelector('.preview-img');
        const btnRemove = dropZone.querySelector('.btn-remove-photo');

        // Drag events
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleImageUpload(files[0], dir, dropZone, previewImg);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (fileInput.files.length > 0) {
                handleImageUpload(fileInput.files[0], dir, dropZone, previewImg);
            }
        });

        btnRemove.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Clear state
            state.uploadedImages[dir] = null;
            fileInput.value = '';
            
            // Update UI
            dropZone.classList.remove('has-file');
            previewImg.src = '';
            
            checkAnalyzeReady();
        });
    });

    function handleImageUpload(file, direction, dropZone, previewImg) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        // Compress and scale image down for API compatibility and fast transmission
        compressImage(file, 800, 0.75, (base64Data) => {
            state.uploadedImages[direction] = base64Data;
            previewImg.src = base64Data;
            dropZone.classList.add('has-file');
            checkAnalyzeReady();
        });
    }

    function compressImage(file, maxDim, quality, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Export to base64 jpeg
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                callback(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function checkAnalyzeReady() {
        const allUploaded = directions.every(dir => state.uploadedImages[dir] !== null);
        btnUploadAnalyze.disabled = !allUploaded;
    }

    btnUploadBack.addEventListener('click', () => {
        // Go back to Step 1
        step2Container.classList.remove('active');
        step1Container.classList.add('active');

        // Reset Stepper
        step1Indicator.classList.remove('completed');
        step2Indicator.classList.remove('active');
        line1.classList.remove('filled');
    });

    /* ==========================================================================
       Step 3: Loading & API Communication
       ========================================================================== */
    btnUploadAnalyze.addEventListener('click', () => {
        // Switch to Loading view
        step2Container.classList.remove('active');
        stepLoadingContainer.classList.add('active');
        
        // Reset progress bar
        progressFill.style.width = '10%';
        loaderStatusMsg.innerText = 'Converting images and packaging API payload...';

        // Animate fake progress steps
        let progressVal = 10;
        const statusMsgs = [
            'Sending request payload to VastuVision API...',
            'VastuVision Vision Engine is scanning the North wall image...',
            'Scanning South wall and mapping spatial coordinates...',
            'Parsing East & West objects (bed, stove, doors)...',
            'Cross-checking layouts against Vastu rule engines...',
            'Formatting structured Vastu compliance report...'
        ];
        
        const progressInterval = setInterval(() => {
            if (progressVal < 90) {
                progressVal += 10;
                progressFill.style.width = `${progressVal}%`;
                
                // Cycle through status messages
                const msgIdx = Math.floor(progressVal / 15) % statusMsgs.length;
                loaderStatusMsg.innerText = statusMsgs[msgIdx];
            }
        }, 1200);

        // Make the API Call
        const payload = {
            room_type: state.selectedRoom,
            images: state.uploadedImages
        };

        fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'bypass'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Server responded with an error');
                });
            }
            return response.json();
        })
        .then(data => {
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            
            setTimeout(() => {
                state.analysisResult = data;
                renderReport();
                
                // Show Step 4 (Results)
                stepLoadingContainer.classList.remove('active');
                stepResultsContainer.classList.add('active');

                // Stepper final state
                step2Indicator.classList.add('completed');
                step3Indicator.classList.add('active');
                line2.classList.add('filled');
            }, 500);
        })
        .catch(err => {
            clearInterval(progressInterval);
            console.error(err);
            alert(`Analysis Failed: ${err.message}. Please try again.`);
            
            // Go back to uploads
            stepLoadingContainer.classList.remove('active');
            step2Container.classList.add('active');
        });
    });

    /* ==========================================================================
       Step 4: Report Rendering & Dynamic Filtering
       ========================================================================== */
    function renderReport() {
        const result = state.analysisResult;
        if (!result) return;

        // Render Titles
        const roomNameFormatted = result.room_type.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        resultsRoomTitle.innerText = `${roomNameFormatted} Analysis — Harmony Assessment`;

        // Render Vastu Score
        const score = result.vastu_score !== undefined ? result.vastu_score : 100;
        animateScore(score);

        // Render 2D floorplan cells
        directions.forEach(dir => {
            // Clear existing elements, keep header label
            cells[dir].innerHTML = `<div class="direction-lbl">${dir}</div>`;
        });

        // Parse items and populate directions
        const objects = result.objects || [];
        
        objects.forEach(obj => {
            const dirLower = (obj.detected_direction || '').toLowerCase().trim();
            
            // Map common direction synonyms to cardinal tags
            let resolvedDir = null;
            if (dirLower.includes('north')) resolvedDir = 'north';
            else if (dirLower.includes('south')) resolvedDir = 'south';
            else if (dirLower.includes('east')) resolvedDir = 'east';
            else if (dirLower.includes('west')) resolvedDir = 'west';

            if (resolvedDir && cells[resolvedDir]) {
                const itemTag = document.createElement('div');
                const safeStatus = sanitizeStatus(obj.status);
                itemTag.className = `placed-item-tag ${safeStatus}`;
                itemTag.innerText = obj.name;
                itemTag.title = `${obj.name} (${safeStatus})`;
                cells[resolvedDir].appendChild(itemTag);
            }
        });

        // Update counts
        const criticalCount = objects.filter(o => o.status === 'critical').length;
        const warningCount = objects.filter(o => o.status === 'warning').length;
        const goodCount = objects.filter(o => o.status === 'good').length;

        countAll.innerText = objects.length;
        countCritical.innerText = criticalCount;
        countWarning.innerText = warningCount;
        countGood.innerText = goodCount;

        // Update Compliance Progress KPI Fills
        const total = objects.length || 1;
        const goodPct = (goodCount / total) * 100;
        const warningPct = (warningCount / total) * 100;
        const criticalPct = (criticalCount / total) * 100;

        document.getElementById('lbl-good-count').innerText = goodCount;
        document.getElementById('lbl-warning-count').innerText = warningCount;
        document.getElementById('lbl-critical-count').innerText = criticalCount;

        document.getElementById('bar-good-fill').style.width = `${goodPct}%`;
        document.getElementById('bar-warning-fill').style.width = `${warningPct}%`;
        document.getElementById('bar-critical-fill').style.width = `${criticalPct}%`;

        // Update Dynamic Room Elemental Energy balance card
        const energyIcon = document.getElementById('energy-icon');
        const energyName = document.getElementById('energy-element-name');
        const energyDesc = document.getElementById('energy-element-desc');

        if (result.room_type === 'bedroom') {
            energyIcon.innerText = '🌍';
            energyName.innerText = 'Earth (Prithvi)';
            energyDesc.innerText = 'Fosters grounding, stability, and peaceful sleep.';
        } else if (result.room_type === 'kitchen') {
            energyIcon.innerText = '🔥';
            energyName.innerText = 'Fire (Agni)';
            energyDesc.innerText = 'Enhances health, cooking energy, and vitality.';
        } else if (result.room_type === 'living_room') {
            energyIcon.innerText = '☁️';
            energyName.innerText = 'Space/Air (Akash/Vayu)';
            energyDesc.innerText = 'Supports social interactions and dynamic harmony.';
        } else if (result.room_type === 'pooja_room') {
            energyIcon.innerText = '🙏';
            energyName.innerText = 'Pure Spiritual (Ether)';
            energyDesc.innerText = 'Maintains maximum cosmic energy and spiritual peace.';
        } else if (result.room_type === 'bathroom') {
            energyIcon.innerText = '💧';
            energyName.innerText = 'Water/Drainage (Jal)';
            energyDesc.innerText = 'Manages negative energy flushing and purification.';
        } else {
            energyIcon.innerText = '🧭';
            energyName.innerText = 'Earth (Prithvi)';
            energyDesc.innerText = 'Coordinates cosmic balance and spatial directions.';
        }

        // Render list based on current active tab
        renderFilteredSuggestions();
    }

    function animateScore(targetScore) {
        let currentScore = 0;
        const duration = 1000; // 1s
        const steps = 30;
        const increment = targetScore / steps;
        const stepTime = duration / steps;
        
        // Define color thresholds
        let strokeColor = 'var(--status-good)';
        let desc = 'Optimal Vastu alignment. Your room exhibits excellent spiritual and spatial harmony.';
        
        if (targetScore < 60) {
            strokeColor = 'var(--status-critical)';
            desc = 'Vastu alignment needs correction. Critical placement violations are causing negative energy blockages.';
        } else if (targetScore < 85) {
            strokeColor = 'var(--status-warning)';
            desc = 'Average Vastu compliance. Subtle adjustments can greatly improve the energy flow of your room.';
        }

        scoreFill.style.stroke = strokeColor;
        scoreDescription.innerText = desc;

        const interval = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(interval);
            }
            scoreText.innerText = Math.round(currentScore);
            
            // Circle circumference = 2 * PI * r = 2 * 3.14 * 50 = 314
            const offset = 314 - (314 * currentScore) / 100;
            scoreFill.style.strokeDashoffset = offset;
        }, stepTime);
    }

    function sanitizeStatus(status) {
        const allowed = ['good', 'warning', 'critical'];
        const s = (status || 'good').toLowerCase().trim();
        return allowed.includes(s) ? s : 'good';
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    function renderFilteredSuggestions() {
        suggestionsListBox.innerHTML = '';
        const objects = state.analysisResult?.objects || [];
        const filter = state.activeFilterTab;

        const filteredList = objects.filter(obj => {
            if (filter === 'all') return true;
            return obj.status === filter;
        });

        if (filteredList.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'no-items-placeholder';
            placeholder.innerText = `No items found matching the '${filter}' compliance level.`;
            suggestionsListBox.appendChild(placeholder);
            return;
        }

        filteredList.forEach(obj => {
            const card = document.createElement('div');
            card.className = 'sugg-card';

            // Status label styling
            let statusLabel = 'Optimal';
            if (obj.status === 'critical') statusLabel = 'Critical';
            else if (obj.status === 'warning') statusLabel = 'Warning';

            card.innerHTML = `
                <div class="sugg-badge ${sanitizeStatus(obj.status)}">${escapeHTML(statusLabel)}</div>
                <div class="sugg-info">
                    <div class="sugg-info-row">
                        <h4>${escapeHTML(obj.name)}</h4>
                        <div class="sugg-pos-details">
                            Detected: <span>${escapeHTML(obj.detected_direction)}</span> | Ideal: <span>${escapeHTML(obj.vastu_ideal)}</span>
                        </div>
                    </div>
                    <p class="sugg-reason">${escapeHTML(obj.reason)}</p>
                    <div class="sugg-advice-box ${sanitizeStatus(obj.status)}">
                        <strong>Remedy / Action</strong>
                        ${escapeHTML(obj.suggestion)}
                    </div>
                </div>
            `;
            suggestionsListBox.appendChild(card);
        });
    }

    // Tab Filtering Listeners
    const filterTabs = [
        { el: tabAll, type: 'all' },
        { el: tabCritical, type: 'critical' },
        { el: tabWarning, type: 'warning' },
        { el: tabGood, type: 'good' }
    ];

    filterTabs.forEach(tab => {
        tab.el.addEventListener('click', () => {
            // Remove active style from all
            filterTabs.forEach(t => t.el.classList.remove('active'));
            // Set active
            tab.el.classList.add('active');
            state.activeFilterTab = tab.type;
            
            renderFilteredSuggestions();
        });
    });

    /* ==========================================================================
       Reset / New Analysis
       ========================================================================== */
    btnReanalyze.addEventListener('click', () => {
        // Reset State
        state.selectedRoom = null;
        state.analysisResult = null;
        directions.forEach(dir => {
            state.uploadedImages[dir] = null;
            const dropZone = document.getElementById(`drop-${dir}`);
            const fileInput = document.getElementById(`file-${dir}`);
            const previewImg = dropZone.querySelector('.preview-img');
            
            dropZone.classList.remove('has-file');
            previewImg.src = '';
            fileInput.value = '';
        });

        // Reset Room Cards Selection
        roomCards.forEach(c => c.classList.remove('selected'));
        btnRoomNext.disabled = true;

        // Reset Stepper
        step1Indicator.classList.add('active');
        step1Indicator.classList.remove('completed');
        step2Indicator.classList.remove('active', 'completed');
        step3Indicator.classList.remove('active');
        line1.classList.remove('filled');
        line2.classList.remove('filled');

        // Transition views
        stepResultsContainer.classList.remove('active');
        step1Container.classList.add('active');
    });

    /* ==========================================================================
       Inbuilt Active Web Compass
       ========================================================================== */
    const btnEnableCompass = document.getElementById('btn-enable-compass');
    const compassDisplay = document.querySelector('.compass-display');
    const compassDial = document.getElementById('compass-dial');
    const compassDeg = document.getElementById('compass-deg');
    const compassDir = document.getElementById('compass-dir');

    if (btnEnableCompass) {
        btnEnableCompass.addEventListener('click', () => {
            // Request orientation permission (iOS 13+)
            if (typeof DeviceOrientationEvent !== 'undefined' && 
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            startCompass();
                        } else {
                            alert('Permission to access compass sensor was denied.');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        alert('Error requesting compass permission.');
                    });
            } else {
                // Android / Non-iOS
                startCompass();
            }
        });
    }

    function startCompass() {
        btnEnableCompass.style.display = 'none';
        compassDisplay.style.display = 'flex';

        const handleOrientation = (event) => {
            let heading = null;
            
            // iOS webkitCompassHeading
            if (event.webkitCompassHeading !== undefined) {
                heading = event.webkitCompassHeading;
            } 
            // Android absolute heading
            else if (event.alpha !== null) {
                // alpha represents rotation around z-axis counter-clockwise
                heading = 360 - event.alpha;
            }

            if (heading !== null) {
                const roundedHeading = Math.round(heading);
                // Rotate the compass dial (opposite to heading) to keep North pointing up
                compassDial.style.transform = `rotate(${-roundedHeading}deg)`;
                compassDeg.innerText = `${roundedHeading}°`;
                compassDir.innerText = getCardinalDirection(roundedHeading);
            }
        };

        // Try absolute orientation first (Android)
        if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        } else if ('ondeviceorientation' in window) {
            window.addEventListener('deviceorientation', handleOrientation, true);
        } else {
            alert('Compass sensor not supported on this browser/device.');
        }
    }

    /* ==========================================================================
       Report Refinement / Correction Submission
       ========================================================================== */
    const btnSubmitRefinement = document.getElementById('btn-submit-refinement');
    const refinementInput = document.getElementById('refinement-input');

    if (btnSubmitRefinement) {
        btnSubmitRefinement.addEventListener('click', () => {
            const correction = refinementInput.value.trim();
            if (!correction) {
                alert('Please type a correction or layout adjustment first.');
                return;
            }

            if (!state.analysisResult) {
                alert('No previous analysis found to refine.');
                return;
            }

            // Show loading state
            btnSubmitRefinement.disabled = true;
            const originalBtnHtml = btnSubmitRefinement.innerHTML;
            btnSubmitRefinement.innerHTML = `
                <span>Refining Layout...</span>
                <svg class="spinner-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spinClockwise 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
            `;
            refinementInput.disabled = true;

            const payload = {
                room_type: state.selectedRoom,
                previous_analysis: state.analysisResult,
                correction: correction
            };

            fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'bypass'
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Server error during refinement');
                    });
                }
                return response.json();
            })
            .then(data => {
                // Clear input
                refinementInput.value = '';
                
                // Update state & re-render
                state.analysisResult = data;
                renderReport();
                
                // Scroll suggestions list to top
                suggestionsListBox.scrollTop = 0;
            })
            .catch(err => {
                console.error(err);
                alert(`Refinement Failed: ${err.message}`);
            })
            .finally(() => {
                // Reset loading state
                btnSubmitRefinement.disabled = false;
                btnSubmitRefinement.innerHTML = originalBtnHtml;
                refinementInput.disabled = false;
            });
        });
    }

    /* ==========================================================================
       Interactive Blueprint Sector Guideline Modal
       ========================================================================== */
    const sectorModal = document.getElementById('sector-info-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalTitle = document.getElementById('modal-sector-title');
    const modalIntro = document.getElementById('modal-sector-intro');
    const modalIdeal = document.getElementById('modal-sector-ideal');
    const modalAvoid = document.getElementById('modal-sector-avoid');

    const sectorData = {
        north: {
            title: "North Sector (Kuber Zone)",
            intro: "Associated with Wealth, Career growth, and new Opportunities. Element: Water.",
            ideal: "Main entrance door, mirrors, water fountains/sinks, clocks, study desk, living room seating.",
            avoid: "Toilets (waste drains), kitchen stoves (fire element clashes with water), heavy wardrobes/storage."
        },
        south: {
            title: "South Sector (Yama Zone)",
            intro: "Associated with Fame, Relaxation, Stability, and peaceful sleep. Element: Fire & Earth.",
            ideal: "Master bed (sleeping head facing South), heavy wardrobes/almirahs, storage rooms, sofa seating.",
            avoid: "Main doors, mirrors (reflects anxiety), water tanks/fountains, Pooja rooms."
        },
        east: {
            title: "East Sector (Indra Zone)",
            intro: "Associated with Health, Vitality, Social Connections, and positive energy. Element: Air & Sun.",
            ideal: "Main entry doors, large ventilation windows, balconies, study desk (facing East), mirrors.",
            avoid: "Toilets, heavy storage structures, clutter, blocking incoming sunlight."
        },
        west: {
            title: "West Sector (Varun Zone)",
            intro: "Associated with Stability, Profits, Business gains, and children's growth. Element: Space.",
            ideal: "Children's beds, dining area setups, toilets, heavy overhead storage tanks.",
            avoid: "Main entrance gates, Pooja room placement, mirrors directly facing the West wall."
        }
    };

    function showSectorModal(direction) {
        const data = sectorData[direction];
        if (!data) return;

        modalTitle.innerText = data.title;
        modalIntro.innerText = data.intro;
        modalIdeal.innerText = data.ideal;
        modalAvoid.innerText = data.avoid;

        sectorModal.classList.add('active');
    }

    // Attach click events to floorplan cells
    const cellN = document.querySelector('.cell-n');
    const cellS = document.querySelector('.cell-s');
    const cellE = document.querySelector('.cell-e');
    const cellW = document.querySelector('.cell-w');

    if (cellN) cellN.addEventListener('click', () => showSectorModal('north'));
    if (cellS) cellS.addEventListener('click', () => showSectorModal('south'));
    if (cellE) cellE.addEventListener('click', () => showSectorModal('east'));
    if (cellW) cellW.addEventListener('click', () => showSectorModal('west'));

    // Close Modal Events
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            sectorModal.classList.remove('active');
        });
    }

    if (sectorModal) {
        sectorModal.addEventListener('click', (e) => {
            if (e.target === sectorModal) {
                sectorModal.classList.remove('active');
            }
        });
    }

    function getCardinalDirection(angle) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(((angle % 360) / 45)) % 8;
        return directions[index];
    }
});
