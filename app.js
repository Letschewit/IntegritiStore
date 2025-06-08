import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { SketchPicker } from 'react-color'

function DraggableLayer({ index, moveLayer, children }) {
  const [, ref] = useDrop({
    accept: "layer",
    hover(item) {
      if (item.index !== index) {
        moveLayer(item.index, index);
        item.index = index;
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: "layer",
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <div ref={(node) => drag(ref(node))} style={{ opacity: isDragging ? 0.5 : 1 }}>
      {children}
    </div>
  );
}

function TShirtDesigner() {
  const canvasRef = useRef(null);
  const [text, setText] = useState("");
  const [color, setColor] = useState("#000000");
  const [tshirtColor, setTshirtColor] = useState("#ffffff");
  const [font, setFont] = useState("Arial");
  const [images, setImages] = useState([]);
  const [textPos, setTextPos] = useState({ x: 200, y: 360 });
  const [draggingText, setDraggingText] = useState(false);
  const [textStyle, setTextStyle] = useState({ bold: false, italic: false, underline: false });
  const [imageTransform, setImageTransform] = useState([]);

  useEffect(() => {
    draw();
    localStorage.setItem("tshirt-design", JSON.stringify({ text, color, tshirtColor, font, images, textPos, textStyle, imageTransform }));
  }, [text, color, tshirtColor, font, images, textPos, textStyle, imageTransform]);

  useEffect(() => {
    const saved = localStorage.getItem("tshirt-design");
    if (saved) {
      const design = JSON.parse(saved);
      setText(design.text);
      setColor(design.color);
      setTshirtColor(design.tshirtColor);
      setFont(design.font);
      setImages(design.images || []);
      setTextPos(design.textPos);
      setTextStyle(design.textStyle);
      setImageTransform(design.imageTransform);
    }
  }, []);

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = tshirtColor;
    ctx.fillRect(100, 50, 200, 300);

    images.forEach((imgObj, idx) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.translate(imgObj.x + imgObj.width / 2, imgObj.y + imgObj.height / 2);
        const transform = imageTransform[idx] || { rotation: 0, flip: false };
        if (transform.flip) ctx.scale(-1, 1);
        ctx.rotate((transform.rotation * Math.PI) / 180);
        ctx.drawImage(img, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);
        ctx.restore();
        drawText(ctx);
      };
      img.src = URL.createObjectURL(imgObj.file);
    });

    if (images.length === 0) drawText(ctx);
  };

  const drawText = (ctx) => {
    ctx.fillStyle = color;
    ctx.font = `${textStyle.italic ? "italic" : ""} ${textStyle.bold ? "bold" : ""} 30px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText(text, textPos.x, textPos.y);
    if (textStyle.underline) {
      const textWidth = ctx.measureText(text).width;
      ctx.beginPath();
      ctx.moveTo(textPos.x - textWidth / 2, textPos.y + 5);
      ctx.lineTo(textPos.x + textWidth / 2, textPos.y + 5);
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImages((prev) => [...prev, { file, x: 150, y: 150, width: 100, height: 100 }]);
      setImageTransform((prev) => [...prev, { rotation: 0, flip: false }]);
    }
  };

  const rotateImage = (index, angle) => {
    const updated = [...imageTransform];
    updated[index].rotation += angle;
    setImageTransform(updated);
  };

  const flipImage = (index) => {
    const updated = [...imageTransform];
    updated[index].flip = !updated[index].flip;
    setImageTransform(updated);
  };

  const toggleStyle = (style) => {
    setTextStyle((prev) => ({ ...prev, [style]: !prev[style] }));
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "tshirt-design.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const moveLayer = (from, to) => {
    const updatedImages = [...images];
    const moved = updatedImages.splice(from, 1)[0];
    updatedImages.splice(to, 0, moved);
    setImages(updatedImages);

    const updatedTransforms = [...imageTransform];
    const movedTransform = updatedTransforms.splice(from, 1)[0];
    updatedTransforms.splice(to, 0, movedTransform);
    setImageTransform(updatedTransforms);
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <input className="border p-2 w-full" placeholder="Enter text" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => toggleStyle("bold")}>Bold</button>
          <button onClick={() => toggleStyle("italic")}>Italic</button>
          <button onClick={() => toggleStyle("underline")}>Underline</button>
        </div>
        <SketchPicker color={color} onChangeComplete={(c) => setColor(c.hex)} />
        <SketchPicker color={tshirtColor} onChangeComplete={(c) => setTshirtColor(c.hex)} />
        <select value={font} onChange={(e) => setFont(e.target.value)} className="border p-2 rounded">
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
          <option value="Times New Roman">Times New Roman</option>
        </select>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {images.map((img, i) => (
          <DraggableLayer key={i} index={i} moveLayer={moveLayer}>
            <div className="border p-2 rounded mt-2">
              <div className="flex gap-2">
                <button onClick={() => rotateImage(i, 15)}>Rotate +15°</button>
                <button onClick={() => rotateImage(i, -15)}>Rotate -15°</button>
                <button onClick={() => flipImage(i)}>Flip</button>
              </div>
            </div>
          </DraggableLayer>
        ))}
        <button className="mt-4 p-2 bg-blue-500 text-white rounded" onClick={downloadImage}>Download</button>
      </div>
      <div className="flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="border rounded"
          onMouseDown={(e) => setDraggingText(true)}
          onMouseUp={() => setDraggingText(false)}
          onMouseMove={(e) => {
            if (!draggingText) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setTextPos({ x, y });
          }}
        />
      </div>
    </div>
  );
}

ReactDOM.render(
  <DndProvider backend={HTML5Backend}>
    <TShirtDesigner />
  </DndProvider>,
  document.getElementById("root")
);