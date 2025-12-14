// Principles: accuracy, evidence, completeness. Code is fully working and robust.

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables ---
    let allQuestions = [];
    let selectedLevels = [];
    let availableQuestions = []; 
    let currentQuestion = null;
    let isSpinning = false;
    
    // --- DOM Elements ---
    const levelSelection = document.getElementById('levelSelection');
    const gameArea = document.getElementById('gameArea');
    const levelButtons = document.querySelectorAll('.level-button');
    const startButton = document.getElementById('startButton');
    const spinButton = document.getElementById('spinButton');
    const questionArea = document.getElementById('questionArea');
    const questionText = document.getElementById('questionText');
    const optionsContainer = document.getElementById('optionsContainer');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const nextQuestionButton = document.getElementById('nextQuestionButton');
    const currentLevelDisplay = document.getElementById('currentLevelDisplay');
    const changeLevelButton = document.getElementById('changeLevelButton');
    const slotTrack = document.getElementById('slotTrack');

    // --- Initialization & Setup ---
    async function loadQuestions() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error(`Loading Error: ${response.statusText}`);
            }
            allQuestions = await response.json();
            console.log('Questions successfully loaded:', allQuestions.length);
            
            // !!! ИСПРАВЛЕНИЕ: Гарантируем, что игровое поле скрыто при инициализации !!!
            gameArea.classList.add('hidden');
            
            setupListeners();
        } catch (error) {
            console.error('Failed to load questions:', error);
            levelSelection.innerHTML = `<p style="color: red;">CRITICAL ERROR: Failed to load quiz data. Check 'questions.json'.</p>`;
        }
    }
    
    function setupListeners() {
        // --- Multiselect Level Logic ---
        levelButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const level = e.target.dataset.level;
                e.target.classList.toggle('selected');
                
                selectedLevels = Array.from(levelButtons)
                    .filter(btn => btn.classList.contains('selected'))
                    .map(btn => btn.dataset.level);
                
                startButton.disabled = selectedLevels.length === 0;
            });
        });
        
        startButton.addEventListener('click', startGame);
        spinButton.addEventListener('click', startSlotSpin);
        changeLevelButton.addEventListener('click', resetToLevelSelection);
    }

    // --- Game Flow Control ---
    function startGame() {
        if (selectedLevels.length === 0) return;

        availableQuestions = allQuestions.filter(q => selectedLevels.includes(q.level));
        
        if (availableQuestions.length === 0) {
            alert("No questions available for the selected levels. Please check your data.");
            return;
        }

        // Показываем игровое поле только здесь
        levelSelection.classList.add('hidden');
        gameArea.classList.remove('hidden');
        
        currentLevelDisplay.textContent = `Challenge Mix: ${selectedLevels.join(', ')}`;
        
        questionArea.classList.add('hidden');
        nextQuestionButton.classList.add('hidden');
        spinButton.disabled = false;
    }

    function resetToLevelSelection() {
        selectedLevels = [];
        availableQuestions = [];
        
        // Скрываем игровое поле при сбросе
        gameArea.classList.add('hidden');
        questionArea.classList.add('hidden');
        levelSelection.classList.remove('hidden');
        levelButtons.forEach(btn => btn.classList.remove('selected'));
        startButton.disabled = true;

        slotTrack.style.transition = 'none';
        slotTrack.style.transform = 'translateX(0)';
        slotTrack.innerHTML = '<div class="slot-card placeholder">SPIN TO LOAD</div>';
    }

    // --- Slot Machine Logic (The "PULL THE LEVER" action) ---

    function startSlotSpin() {
        if (isSpinning || availableQuestions.length === 0) return;

        isSpinning = true;
        spinButton.disabled = true;
        questionArea.classList.add('hidden');
        feedbackMessage.textContent = '';
        nextQuestionButton.classList.add('hidden');

        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const selectedQuestion = availableQuestions[randomIndex];
        currentQuestion = selectedQuestion;
        
        // 2. Prepare the slot cards for the animation
        const fillerCards = Array(Math.floor(Math.random() * 6) + 15).fill(0).map((_, i) => {
            const randomQ = allQuestions[Math.floor(Math.random() * allQuestions.length)];
            const text = randomQ.question.substring(0, 30); 
            return `<div class="slot-card filler">Level: ${randomQ.level} | ${text}...</div>`;
        }).join('');
        
        const finalCard = `<div class="slot-card final-question">NEW CHALLENGE: ${selectedQuestion.question.substring(0, 40)}...</div>`;
        
        slotTrack.innerHTML = fillerCards + finalCard;

        // 3. Calculate the distance to scroll 
        const slotWidth = slotTrack.clientWidth; 
        const distanceToScroll = (slotTrack.children.length - 1) * slotWidth;
        
        // 4. Run the animation (5s cubic-bezier for smooth deceleration)
        slotTrack.style.transition = 'transform 5s cubic-bezier(0.1, 0.7, 0.8, 1.0)';
        slotTrack.style.transform = `translateX(-${distanceToScroll}px)`;

        // 5. Wait for animation to finish
        setTimeout(() => {
            isSpinning = false;
            
            // Cleanup
            slotTrack.style.transition = 'none';
            slotTrack.style.transform = `translateX(0)`;
            slotTrack.innerHTML = finalCard; 

            displayQuestion(selectedQuestion);
            
        }, 5000); 
    }

    // --- Quiz Functions ---

    function displayQuestion(q) {
        questionText.textContent = q.question;
        optionsContainer.innerHTML = '';
        
        const shuffledOptions = shuffleArray([...q.options]);

        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.classList.add('option-button');
            button.textContent = option;
            button.addEventListener('click', () => checkAnswer(button, option, q.answer));
            optionsContainer.appendChild(button);
        });

        questionArea.classList.remove('hidden');
        feedbackMessage.textContent = '';
    }

    function checkAnswer(selectedButton, selectedOption, correctAnswer) {
        Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);
        
        if (selectedOption === correctAnswer) {
            feedbackMessage.textContent = 'TRANSCENDENT! Answer is validated.';
            selectedButton.classList.add('correct');
        } else {
            feedbackMessage.textContent = `FAILURE. The CORRECT answer was: "${correctAnswer}"`;
            selectedButton.classList.add('incorrect');
            
            Array.from(optionsContainer.children).forEach(btn => {
                if (btn.textContent === correctAnswer) {
                    btn.classList.add('correct');
                }
            });
        }
        
        removeQuestion(currentQuestion.id);

        if (availableQuestions.length === 0) {
            nextQuestionButton.textContent = 'LEVELS CLEARED!';
        } else {
            nextQuestionButton.textContent = 'NEXT CHALLENGE';
        }
        nextQuestionButton.classList.remove('hidden');
        nextQuestionButton.onclick = nextChallenge;
    }
    
    function removeQuestion(id) {
        availableQuestions = availableQuestions.filter(q => q.id !== id);
        
        if (availableQuestions.length === 0) {
             feedbackMessage.textContent += ' ALL SELECTED CHALLENGES COMPLETED. Return to Level Selection.';
        }
    }

    function nextChallenge() {
        if (availableQuestions.length === 0) {
            resetToLevelSelection();
            return;
        }
        spinButton.disabled = false;
        questionArea.classList.add('hidden');
        feedbackMessage.textContent = '';
        nextQuestionButton.classList.add('hidden');
        currentQuestion = null;
        
        slotTrack.style.transition = 'none';
        slotTrack.style.transform = 'translateX(0)';
        slotTrack.innerHTML = '<div class="slot-card placeholder">SPIN TO LOAD</div>';
    }

    // --- Utility Function: Fisher-Yates Shuffle ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Start Application ---
    loadQuestions();
});