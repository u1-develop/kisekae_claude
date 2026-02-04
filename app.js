const { useState } = React;

const CLOTHING_IMAGES = [
    '10-5259-684-15-1_l.webp',
    '12-5201-146-05-1_l.webp',
    '12-5224-149-87-1_l.webp',
    '13-5204-142-09-1_l.webp'
];

function VirtualTryOn() {
    const [apiKey, setApiKey] = useState('');
    const [personImage, setPersonImage] = useState(null);
    const [clothingImage, setClothingImage] = useState(null);
    const [personPreview, setPersonPreview] = useState(null);
    const [clothingPreview, setClothingPreview] = useState(null);
    const [selectedClothing, setSelectedClothing] = useState(null);
    const [resultImage, setResultImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);

    const handleImageUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result.split(',')[1];
            if (type === 'person') {
                setPersonImage(base64);
                setPersonPreview(event.target.result);
            } else {
                setClothingImage(base64);
                setClothingPreview(event.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e, type) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) {
            setError('画像ファイルをドロップしてください');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result.split(',')[1];
            if (type === 'person') {
                setPersonImage(base64);
                setPersonPreview(event.target.result);
            } else {
                setClothingImage(base64);
                setClothingPreview(event.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleClothingSelect = async (filename) => {
        try {
            setSelectedClothing(filename);
            const response = await fetch(`./images/${filename}`);
            const blob = await response.blob();

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result.split(',')[1];
                setClothingImage(base64);
                setClothingPreview(event.target.result);
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Error loading clothing image:', err);
            setError('服の画像の読み込みに失敗しました');
        }
    };

    const clearImage = (type) => {
        if (type === 'person') {
            setPersonImage(null);
            setPersonPreview(null);
        } else {
            setClothingImage(null);
            setClothingPreview(null);
            setSelectedClothing(null);
        }
    };

    const downloadImage = () => {
        if (!resultImage) return;

        const link = document.createElement('a');
        link.href = resultImage;
        link.download = 'virtual-tryon-result.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const listModels = async () => {
        if (!apiKey.trim()) {
            setError('APIキーを入力してください');
            return;
        }

        setLoading(true);
        setError(null);
        setModelInfo(null);

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const modelList = data.models
                .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                .map(m => m.name)
                .join('\n');

            setModelInfo(`利用可能なモデル:\n${modelList}`);
        } catch (err) {
            setError(`モデル取得エラー: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const generateImage = async () => {
        if (!apiKey.trim()) {
            setError('APIキーを入力してください');
            return;
        }

        if (!personImage || !clothingImage) {
            setError('両方の画像をアップロードしてください');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        setResultImage(null);

        try {
            const requestBody = {
                contents: [{
                    parts: [
                        {
                            text: "Generate a photorealistic image showing this person wearing the clothing item in the second image. CRITICAL REQUIREMENTS:\n\n1. PRESERVE COMPLETELY: The person's face, facial features, hairstyle, body proportions, pose, and background must remain EXACTLY as shown in the original photo.\n\n2. MODIFY ONLY: Replace the current clothing with the new clothing item shown in the second image.\n\n3. REALISTIC INTEGRATION: Ensure the new clothing fits naturally with proper perspective, draping, shadows, and lighting that match the original photo's conditions.\n\n4. ACCURATE REPRODUCTION: The clothing design, color, pattern, and style must exactly match the clothing item shown.\n\n5. OUTPUT: A single photorealistic image of the same person in the same setting, wearing the new clothes.\n\nDo not change anything except the clothing. The person and environment must be identical to the original."
                        },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: personImage
                            }
                        },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: clothingImage
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            };

            console.log('Using model: gemini-2.5-flash-image');

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error Details:', errorData);

                if (response.status === 403) {
                    throw new Error('APIキーが無効です。Google AI Studioで正しいキーを確認してください。');
                } else if (response.status === 404) {
                    throw new Error('モデルが見つかりません。APIキーを確認してください。');
                } else if (response.status === 400) {
                    throw new Error(`リクエストエラー: ${errorData.error?.message || '不正なリクエスト形式'}`);
                } else {
                    throw new Error(`API Error: ${response.status} - ${errorData.error?.message || '不明なエラー'}`);
                }
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (data.candidates && data.candidates[0]?.content?.parts) {
                // Look for image data in the response
                const imagePart = data.candidates[0].content.parts.find(
                    part => part.inlineData || part.inline_data
                );

                if (imagePart) {
                    const imageData = imagePart.inlineData?.data || imagePart.inline_data?.data;
                    const mimeType = imagePart.inlineData?.mimeType || imagePart.inline_data?.mime_type || 'image/jpeg';
                    setResultImage(`data:${mimeType};base64,${imageData}`);
                    setSuccess('画像生成が完了しました！');
                } else {
                    // Check if there's a text response
                    const textPart = data.candidates[0].content.parts.find(part => part.text);
                    if (textPart) {
                        console.log('Text response:', textPart.text);
                        throw new Error(`このモデルは画像生成に対応していません。テキストレスポンス: ${textPart.text.substring(0, 200)}...`);
                    } else {
                        console.log('Full response:', JSON.stringify(data, null, 2));
                        throw new Error('レスポンスに画像データが含まれていません。');
                    }
                }
            } else if (data.error) {
                throw new Error(data.error.message || 'APIエラーが発生しました');
            } else {
                console.log('Unexpected response structure:', JSON.stringify(data, null, 2));
                throw new Error('予期しないレスポンス形式です');
            }
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <header>
                <h1>AI Virtual Try-On</h1>
                <p className="subtitle">バーチャル試着体験@Gemini 2.5 Flash Image</p>
            </header>

            <div className="api-key-section">
                <label className="api-key-label" htmlFor="api-key">
                    🔑 Gemini API Key
                </label>
                <input
                    id="api-key"
                    type="password"
                    className="api-key-input"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />

                <button className="test-button" onClick={listModels} disabled={loading}>
                    📋 API接続テスト
                </button>

                <div className="api-key-hint">
                    APIキーは <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a> で無料取得できます
                </div>

                {modelInfo && (
                    <div className="info-message">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {modelInfo}
                        </pre>
                    </div>
                )}
            </div>

            <div className="main-grid">
                <div className="upload-card">
                    <h2 className="card-title">
                        <span className="card-icon">1</span>
                        対象人物
                    </h2>
                    <label htmlFor="person-upload">
                        <div
                            className={`upload-zone ${personPreview ? 'has-image' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'person')}
                        >
                            {personPreview ? (
                                <img src={personPreview} alt="Person" className="preview-image" />
                            ) : (
                                <>
                                    <div className="upload-icon">👤</div>
                                    <div className="upload-text">クリックまたはドラッグ&ドロップ</div>
                                    <div className="upload-hint">JPG, PNG対応</div>
                                </>
                            )}
                        </div>
                    </label>
                    <input
                        id="person-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'person')}
                    />
                    {personPreview && (
                        <button className="clear-button" onClick={() => clearImage('person')}>
                            クリア
                        </button>
                    )}
                </div>

                <div className="upload-card">
                    <h2 className="card-title">
                        <span className="card-icon">2</span>
                        試着する服を選択
                    </h2>
                    <div className="clothing-grid">
                        {CLOTHING_IMAGES.map((img, index) => (
                            <div
                                key={index}
                                className={`clothing-item ${selectedClothing === img ? 'selected' : ''}`}
                                onClick={() => handleClothingSelect(img)}
                            >
                                <img src={`./images/${img}`} alt={`Clothing ${index + 1}`} />
                                {/* <div className="clothing-item-overlay">クリックして選択</div> */}
                            </div>
                        ))}
                    </div>
                    <div className="upload-hint" style={{ marginTop: '1rem', textAlign: 'center' }}>
                        リストから試着したい服を選択してください
                    </div>
                </div>

                <div className={`upload-card ${!resultImage && !loading ? 'disabled' : ''}`}>
                    <h2 className="card-title">
                        <span className="card-icon">3</span>
                        生成結果
                    </h2>
                    <div className="upload-zone">
                        {loading ? (
                            <>
                                <div className="loading-spinner"></div>
                                <div className="upload-text" style={{ marginTop: '1rem' }}>
                                    AI生成中...
                                </div>
                            </>
                        ) : resultImage ? (
                            <img src={resultImage} alt="Result" className="preview-image" />
                        ) : (
                            <>
                                <div className="upload-icon">✨</div>
                                <div className="upload-text">合成画像がここに表示されます</div>
                            </>
                        )}
                    </div>
                    {resultImage && (
                        <button className="download-button" onClick={downloadImage}>
                            💾 ダウンロード
                        </button>
                    )}
                    <div className="info-badge">
                        🔒 服以外は変更されません
                    </div>
                </div>
            </div>

            <div className="generate-section">
                <button
                    className="generate-button"
                    onClick={generateImage}
                    disabled={!apiKey || !personImage || !clothingImage || loading}
                >
                    {loading ? (
                        <>
                            生成中<span className="loading">⏳</span>
                        </>
                    ) : (
                        '🎨 画像を生成'
                    )}
                </button>
                {error && (
                    <div className="error-message">
                        ❌ {error}
                    </div>
                )}
                {success && (
                    <div className="success-message">
                        ✅ {success}
                    </div>
                )}
            </div>
        </div>
    );
}

ReactDOM.render(<VirtualTryOn />, document.getElementById('root'));
