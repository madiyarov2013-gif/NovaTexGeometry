import { useState } from 'react';
import { shapes, sampleProblems, calculateVolume, calculateSurfaceArea } from '../data/shapes';

export function TestSection({ currentShape, currentParams }) {
    const [activeTab, setActiveTab] = useState('problems'); // 'problems' | 'create' | 'quiz'
    const [showAnswer, setShowAnswer] = useState({});
    const [quizAnswers, setQuizAnswers] = useState({});
    const [customProblem, setCustomProblem] = useState({
        shape: 'cylinder',
        question: '',
        params: {}
    });

    const toggleAnswer = (id) => {
        setShowAnswer(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const generateRandomProblem = () => {
        const shapeKeys = Object.keys(shapes);
        const randomShape = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
        const shape = shapes[randomShape];

        const params = {};
        shape.parameters.forEach(param => {
            params[param.key] = Math.floor(Math.random() * (param.max - param.min) + param.min);
        });

        const volume = calculateVolume(randomShape, params);
        const surfaceArea = calculateSurfaceArea(randomShape, params);

        return {
            shape: randomShape,
            shapeName: shape.name,
            params,
            volume: volume.toFixed(2),
            surfaceArea: surfaceArea.toFixed(2)
        };
    };

    const [randomProblem, setRandomProblem] = useState(generateRandomProblem());

    return (
        <div className="test-section">
            <h2>📝 Test va Masalalar</h2>

            {/* Tablar */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'problems' ? 'active' : ''}`}
                    onClick={() => setActiveTab('problems')}
                >
                    📚 Namuna masalalar
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    ✏️ Masala yaratish
                </button>
                <button
                    className={`tab ${activeTab === 'quiz' ? 'active' : ''}`}
                    onClick={() => setActiveTab('quiz')}
                >
                    🎯 Tasodifiy masala
                </button>
            </div>

            {/* Namuna masalalar */}
            {activeTab === 'problems' && (
                <div className="problems-list">
                    {sampleProblems.map(problem => (
                        <div key={problem.id} className="problem-card">
                            <div className="problem-shape">{shapes[problem.shape]?.name}</div>
                            <div className="problem-question">{problem.question}</div>
                            <button
                                className="show-answer-btn"
                                onClick={() => toggleAnswer(problem.id)}
                            >
                                {showAnswer[problem.id] ? '🙈 Javobni yashirish' : '👁️ Javobni ko\'rish'}
                            </button>
                            {showAnswer[problem.id] && (
                                <div className="problem-answer">
                                    <strong>Javob:</strong> {problem.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Masala yaratish */}
            {activeTab === 'create' && (
                <div className="create-problem">
                    <div className="current-shape-info">
                        <h4>Joriy shakl asosida masala yarating:</h4>
                        <p><strong>Shakl:</strong> {shapes[currentShape]?.name}</p>
                        <p><strong>Parametrlar:</strong></p>
                        <ul>
                            {Object.entries(currentParams).map(([key, value]) => (
                                <li key={key}>{key}: {value}</li>
                            ))}
                        </ul>
                        <div className="calculated-values">
                            <p><strong>Hajmi:</strong> {calculateVolume(currentShape, currentParams).toFixed(2)} sm³</p>
                            <p><strong>Sirt maydoni:</strong> {calculateSurfaceArea(currentShape, currentParams).toFixed(2)} sm²</p>
                        </div>
                    </div>

                    <div className="problem-template">
                        <h4>Masala namunasi:</h4>
                        <div className="template-text">
                            {currentShape === 'cylinder' && (
                                <p>Radiusi {currentParams.radius || 3} sm, balandligi {currentParams.height || 5} sm bo'lgan silindrning hajmini va sirt maydonini toping.</p>
                            )}
                            {currentShape === 'sphere' && (
                                <p>Radiusi {currentParams.radius || 3} sm bo'lgan sharning hajmini va sirt maydonini toping.</p>
                            )}
                            {currentShape === 'cone' && (
                                <p>Asos radiusi {currentParams.radius || 3} sm, balandligi {currentParams.height || 5} sm bo'lgan konusning hajmini toping.</p>
                            )}
                            {currentShape === 'pyramid' && (
                                <p>Asosi {currentParams.sides || 4}-burchakli, asos radiusi {currentParams.radius || 3} sm, balandligi {currentParams.height || 5} sm bo'lgan piramidaning hajmini toping.</p>
                            )}
                            {currentShape === 'prism' && (
                                <p>Asosi {currentParams.sides || 6}-burchakli, asos radiusi {currentParams.radius || 3} sm, balandligi {currentParams.height || 5} sm bo'lgan prizmaning hajmini toping.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tasodifiy masala */}
            {activeTab === 'quiz' && (
                <div className="quiz-section">
                    <div className="random-problem">
                        <h4>🎲 Tasodifiy masala:</h4>
                        <div className="problem-card">
                            <div className="problem-shape">{randomProblem.shapeName}</div>
                            <div className="problem-question">
                                {randomProblem.shapeName}ning parametrlari: {' '}
                                {Object.entries(randomProblem.params).map(([key, value]) => (
                                    <span key={key}>{key}: {value} sm, </span>
                                ))}
                                <br />
                                Hajmini va sirt maydonini toping.
                            </div>

                            <div className="quiz-input">
                                <label>
                                    Hajmi (sm³):
                                    <input
                                        type="number"
                                        placeholder="Javobingizni kiriting"
                                        onChange={(e) => setQuizAnswers(prev => ({ ...prev, volume: e.target.value }))}
                                    />
                                </label>
                                <label>
                                    Sirt maydoni (sm²):
                                    <input
                                        type="number"
                                        placeholder="Javobingizni kiriting"
                                        onChange={(e) => setQuizAnswers(prev => ({ ...prev, surface: e.target.value }))}
                                    />
                                </label>
                            </div>

                            <button
                                className="show-answer-btn"
                                onClick={() => toggleAnswer('random')}
                            >
                                {showAnswer['random'] ? '🙈 Javobni yashirish' : '✅ Tekshirish'}
                            </button>

                            {showAnswer['random'] && (
                                <div className="problem-answer">
                                    <p><strong>To'g'ri javob:</strong></p>
                                    <p>Hajmi: {randomProblem.volume} sm³</p>
                                    <p>Sirt maydoni: {randomProblem.surfaceArea} sm²</p>
                                </div>
                            )}

                            <button
                                className="new-problem-btn"
                                onClick={() => {
                                    setRandomProblem(generateRandomProblem());
                                    setShowAnswer({});
                                    setQuizAnswers({});
                                }}
                            >
                                🔄 Yangi masala
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
