import { useState, useRef, useEffect } from 'react'
import './App.css'

// Constants for customization
const ASPECT_RATIO = 2.35 / 1;
const BLACK_STRIP_HEIGHT = 0.075; // 7.5% of frame height
const CHINESE_FONT_SIZE = 20; // Reduced from 24
const ENGLISH_FONT_SIZE = 16; // Reduced from 22

const App = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [offsetY, setOffsetY] = useState(0);
  const [frameDimensions, setFrameDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [subtitles, setSubtitles] = useState({ chinese: '', english: '' });
  const [warnings, setWarnings] = useState({ chinese: false, english: false });
  const [editedImageUrl, setEditedImageUrl] = useState('');

  useEffect(() => {
    if (imageRef.current) {
      const updateDimensions = () => {
        const imgWidth = imageRef.current.naturalWidth;
        const frameWidth = Math.min(imgWidth, window.innerWidth * 0.9); // 90% of viewport width
        const frameHeight = frameWidth / ASPECT_RATIO;
        setFrameDimensions({ width: frameWidth, height: frameHeight });
      }
      imageRef.current.addEventListener('load', updateDimensions)
      return () => imageRef.current.removeEventListener('load', updateDimensions)
    }
  }, [imageUrl])

  const handleSubmit = (e) => {
    e.preventDefault();
    const file = e.target.image.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  }

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only proceed for left mouse button
    
    const startY = e.clientY - offsetY;

    const handleMouseMove = (moveEvent) => {
      const newOffsetY = moveEvent.clientY - startY;
      
      // Calculate the limits
      const frameHeight = containerRef.current.clientHeight;
      const imageHeight = imageRef.current.clientHeight;
      const stripHeight = frameHeight * BLACK_STRIP_HEIGHT;
      
      const maxOffsetY = stripHeight; // Top limit
      const minOffsetY = frameHeight - imageHeight - stripHeight; // Bottom limit
      
      // Apply the new offset within the calculated limits
      setOffsetY(Math.min(Math.max(newOffsetY, minOffsetY), maxOffsetY));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const MAX_LENGTH = {
    chinese: 30,
    english: 50  // Increased length for English
  };

  const handleSubtitleChange = (language, value) => {
    if (value.length <= MAX_LENGTH[language]) {
      setSubtitles(prev => ({ ...prev, [language]: value }));
      setWarnings(prev => ({ ...prev, [language]: false }));
    } else {
      setWarnings(prev => ({ ...prev, [language]: true }));
    }
  };

  const generateEditedImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to match the frame
    canvas.width = frameDimensions.width;
    canvas.height = frameDimensions.height;

    // Draw black strips
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height * BLACK_STRIP_HEIGHT);
    ctx.fillRect(0, canvas.height * (1 - BLACK_STRIP_HEIGHT), canvas.width, canvas.height * BLACK_STRIP_HEIGHT);

    // Draw the image
    const img = imageRef.current;
    const scaleFactor = img.naturalWidth / img.width;
    const cropHeight = canvas.height * (1 - 2 * BLACK_STRIP_HEIGHT);
    const sourceY = Math.max(0, -offsetY * scaleFactor);
    const sourceHeight = Math.min(img.naturalHeight, cropHeight * scaleFactor);
    const destHeight = Math.min(cropHeight, (img.naturalHeight / scaleFactor) + offsetY);
    const destY = canvas.height * BLACK_STRIP_HEIGHT + Math.max(0, cropHeight - destHeight);

    ctx.drawImage(
      img,
      0, sourceY,
      canvas.width * scaleFactor, sourceHeight,
      0, destY,
      canvas.width, destHeight
    );

    // Draw subtitles
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const bottomStripTop = canvas.height * (1 - BLACK_STRIP_HEIGHT);
    const subtitlePadding = 10; // Padding from the top of the bottom strip

    // Chinese subtitle
    ctx.font = `${CHINESE_FONT_SIZE}px "SimHei", "Microsoft YaHei", sans-serif`;
    ctx.fillText(subtitles.chinese, canvas.width / 2, bottomStripTop - subtitlePadding - ENGLISH_FONT_SIZE - 5);

    // English subtitle
    ctx.font = `${ENGLISH_FONT_SIZE}px "Arial", sans-serif`;
    ctx.fillText(subtitles.english, canvas.width / 2, bottomStripTop - subtitlePadding);

    // Convert canvas to data URL
    const editedImageDataUrl = canvas.toDataURL('image/jpeg', 1.0);
    setEditedImageUrl(editedImageDataUrl);
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <label htmlFor="image">Choose a picture:</label>
        <input type="file" id="image" name="image" accept="image/png, image/jpeg" />
        <button type="submit">Submit</button>
      </form>
      {imageUrl && ( 
        <>
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown} 
            style={{
              overflow: 'hidden',
              width: `${frameDimensions.width}px`,
              height: `${frameDimensions.height}px`,
              maxWidth: '90%',
              maxHeight: '80vh',
              position: 'relative',
              cursor: 'ns-resize',
              margin: '20px auto',
              border: '2px solid #333',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              backgroundColor: '#f0f0f0',
            }}
          >
            {/* Add top black strip */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '7.5%',
              backgroundColor: 'black',
              zIndex: 1,
            }} />
            
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt="Selected" 
              style={{
                transform: `translateY(${offsetY}px)`,
                transformOrigin: 'center',
                transition: 'transform 0.1s ease-out',
                position: 'absolute',
                left: '50%',
                marginLeft: '-50%',
                pointerEvents: 'none',
                maxWidth: 'none',
                maxHeight: 'none',
              }}
            />
            
            {/* Add bottom black strip */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '7.5%',
              backgroundColor: 'black',
              zIndex: 1,
            }} />
            
            {/* Add subtitles */}
            <div style={{
              position: 'absolute',
              bottom: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              color: 'white',
              textShadow: '2px 2px 2px black',
              zIndex: 10,
              width: '80%',
            }}>
              <div style={{ 
                fontFamily: '"SimHei", "Microsoft YaHei", sans-serif', 
                fontSize: `${CHINESE_FONT_SIZE}px`, 
                marginBottom: '5px' 
              }}>
                {subtitles.chinese}
              </div>
              <div style={{ 
                fontFamily: '"Arial", sans-serif', 
                fontSize: `${ENGLISH_FONT_SIZE}px` 
              }}>
                {subtitles.english}
              </div>
            </div>
          </div>
          
          {/* Add floating subtitle editor */}
          <div style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            width: '250px',
            padding: '20px',
            backgroundColor: 'white',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            borderRadius: '5px',
            zIndex: 1000,
          }}>
            <h3>Subtitles</h3>
            <div>
              <input
                type="text"
                placeholder="中文字幕"
                value={subtitles.chinese}
                onChange={(e) => handleSubtitleChange('chinese', e.target.value)}
                style={{ 
                  width: '100%', 
                  marginBottom: '5px', 
                  padding: '5px',
                  border: warnings.chinese ? '2px solid red' : '1px solid #ccc'
                }}
              />
              {warnings.chinese && <p style={{ color: 'red', margin: '0 0 10px' }}>文字多</p>}
            </div>
            <div>
              <input
                type="text"
                placeholder="English subtitle"
                value={subtitles.english}
                onChange={(e) => handleSubtitleChange('english', e.target.value)}
                style={{ 
                  width: '100%', 
                  marginBottom: '5px', 
                  padding: '5px',
                  border: warnings.english ? '2px solid red' : '1px solid #ccc'
                }}
              />
              {warnings.english && <p style={{ color: 'red', margin: '0' }}>Text too long</p>}
            </div>
          </div>
          
          <button 
            onClick={generateEditedImage} 
            style={{ marginTop: '10px' }}
          >
            Generate Edited Image
          </button>
        </>
      )}
      
      {editedImageUrl && (
        <div style={{ marginTop: '20px' }}>
          <h3>Edited Image:</h3>
          <img src={editedImageUrl} alt="Edited" style={{ maxWidth: '100%' }} />
        </div>
      )}
    </div>
  )
}

export default App
