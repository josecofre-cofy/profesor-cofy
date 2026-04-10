/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  User, 
  Bot, 
  Calculator, 
  BookOpen, 
  GraduationCap, 
  ChevronRight,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Volume2,
  Search,
  Brain,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getTutorResponse, generateSpeech, generateVisualAid, MessageContent } from "./services/geminiService";
import { cn } from "@/lib/utils";

interface Message extends MessageContent {
  timestamp: Date;
  visualAid?: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ mimeType: string; data: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial state for "Inicio obligatorio"
  const [studentInfo, setStudentInfo] = useState({
    grade: "",
    topic: "",
    confidence: "",
    goal: ""
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleStart = async () => {
    if (!studentInfo.grade || !studentInfo.topic || !studentInfo.confidence || !studentInfo.goal) return;
    
    setIsStarted(true);
    const initialPrompt = `Hola, soy un estudiante de ${studentInfo.grade} básico. Estoy viendo el contenido de "${studentInfo.topic}". Me siento ${studentInfo.confidence} en este tema. Me gustaría ${studentInfo.goal}.`;
    
    const initialMessage: Message = {
      role: "user",
      content: initialPrompt,
      timestamp: new Date()
    };
    
    setMessages([initialMessage]);
    setIsLoading(true);
    
    try {
      const response = await getTutorResponse([initialMessage], { useThinking, useSearch });
      setMessages(prev => [...prev, {
        role: "model",
        content: response || "Lo siento, hubo un error al conectar con el tutor.",
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await getTutorResponse([...messages, userMessage], { useThinking, useSearch });
      
      setMessages(prev => [...prev, {
        role: "model",
        content: response || "Lo siento, no pude procesar tu mensaje.",
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("Error getting tutor response:", error);
      setMessages(prev => [...prev, {
        role: "model",
        content: "Hubo un problema técnico. Por favor, intenta de nuevo.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setIsStarted(false);
    setStudentInfo({
      grade: "",
      topic: "",
      confidence: "",
      goal: ""
    });
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Dynamic sidebar content based on topic
  const getSidebarContent = () => {
    const topic = (studentInfo.topic || "").toLowerCase();
    
    if (topic.includes("entero")) {
      return {
        tips: [
          { title: "Regla de Signos", content: "Signos iguales (+) • Signos distintos (-). ¡Aplica para mult y div!" },
          { title: "Recta Numérica", content: "Hacia la derecha sumas, hacia la izquierda restas." }
        ],
        errors: [
          "Confundir el valor absoluto con el opuesto.",
          "Restar mal cuando hay doble signo (ej: 5 - -3 = 5 + 3)."
        ],
        suggested: ["¿Cómo sumo negativos?", "Ejercicios de resta", "Explicar valor absoluto"]
      };
    }
    
    if (topic.includes("fraccion") || topic.includes("simplific")) {
      return {
        tips: [
          { title: "MCM", content: "Para sumar o restar fracciones con distinto denominador, busca el Mínimo Común Múltiplo." },
          { title: "Simplificación", content: "Divide numerador y denominador por el mismo número para achicar la fracción." }
        ],
        errors: [
          "Sumar numeradores con numeradores y denominadores con denominadores.",
          "Olvidar simplificar el resultado final."
        ],
        suggested: ["¿Cómo saco el MCM?", "Simplificar 12/24", "Suma de fracciones"]
      };
    }

    if (topic.includes("ecuacion")) {
      return {
        tips: [
          { title: "Balanza", content: "Lo que haces a un lado de la igualdad, debes hacerlo al otro para mantener el equilibrio." },
          { title: "Despejar", content: "Si algo suma, pasa restando. Si multiplica, pasa dividiendo." }
        ],
        errors: [
          "No cambiar el signo al trasponer términos.",
          "Multiplicar solo un término y no toda la expresión."
        ],
        suggested: ["Resolver 2x + 5 = 15", "Pasos para despejar", "Ecuaciones con paréntesis"]
      };
    }

    // Default content
    return {
      tips: [
        { title: "Regla de Signos", content: "Al multiplicar o dividir, signos iguales dan (+), distintos dan (-)." },
        { title: "Prioridad", content: "Paréntesis > Potencias > Mult/Div > Suma/Resta." }
      ],
      errors: [
        "Olvidar el signo al pasar un término al otro lado.",
        "Confundir conceptos básicos de base y exponente."
      ],
      suggested: ["Dame un desafío", "Explicar prioridad", "Repasar lo básico"]
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage({
          mimeType: file.type,
          data: base64String
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlayTTS = async (text: string) => {
    try {
      const audioData = await generateSpeech(text);
      if (audioData) {
        const audio = new Audio(`data:audio/wav;base64,${audioData}`);
        audio.play();
      }
    } catch (error) {
      console.error("Error playing TTS:", error);
    }
  };

  const handleGenerateVisualAid = async () => {
    setIsLoading(true);
    try {
      const imageUrl = await generateVisualAid(studentInfo.topic);
      if (imageUrl) {
        setMessages(prev => [...prev, {
          role: "model",
          content: `Aquí tienes una ayuda visual sobre **${studentInfo.topic}**:`,
          timestamp: new Date(),
          visualAid: imageUrl
        }]);
      }
    } catch (error) {
      console.error("Error generating visual aid:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sidebarContent = getSidebarContent();

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                    <GraduationCap className="w-10 h-10" />
                  </div>
                  <Badge variant="secondary" className="bg-amber-400 text-amber-950 border-none font-bold px-3 py-1">Chile 🇨🇱</Badge>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-3">Tutor de Matemática Pro</h1>
                <p className="text-blue-100 text-xl font-medium">Aprendizaje personalizado para 7° y 8° básico.</p>
              </div>
              <Sparkles className="absolute -right-12 -bottom-12 w-64 h-64 text-white/10 rotate-12" />
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            </div>
            
            <CardContent className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">¿En qué curso estás?</label>
                  <div className="flex gap-3">
                    {["7°", "8°"].map((g) => (
                      <motion.div key={g} className="flex-1" whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant={studentInfo.grade === g ? "default" : "outline"}
                          className={cn(
                            "w-full h-14 text-xl font-bold rounded-2xl transition-all duration-300",
                            studentInfo.grade === g ? "bg-blue-600 shadow-lg shadow-blue-200" : "hover:bg-blue-50 border-slate-200"
                          )}
                          onClick={() => setStudentInfo(prev => ({ ...prev, grade: g }))}
                        >
                          {g} Básico
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">¿Nivel de seguridad?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Seguro/a", "Más o menos", "Inseguro/a", "Perdido/a"].map((c) => (
                      <motion.div key={c} whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant={studentInfo.confidence === c ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "w-full h-11 text-xs font-semibold rounded-xl transition-all duration-300",
                            studentInfo.confidence === c ? "bg-blue-600 shadow-md shadow-blue-100" : "hover:bg-blue-50 border-slate-200"
                          )}
                          onClick={() => setStudentInfo(prev => ({ ...prev, confidence: c }))}
                        >
                          {c}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">¿Qué tema quieres aprender?</label>
                <Input 
                  placeholder="Ej: Números enteros, Fracciones, Ecuaciones..." 
                  className="h-14 text-lg rounded-2xl border-slate-200 focus:ring-blue-500 bg-slate-50/50"
                  value={studentInfo.topic}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, topic: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Números Enteros", "Fracciones", "Ecuaciones", "Porcentajes", "Geometría"].map(t => (
                    <Badge 
                      key={t} 
                      variant={studentInfo.topic === t ? "default" : "secondary"} 
                      className={cn(
                        "cursor-pointer px-4 py-2 text-sm rounded-full transition-all duration-300 font-medium",
                        studentInfo.topic === t ? "bg-blue-600 scale-105 shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                      )}
                      onClick={() => setStudentInfo(prev => ({ ...prev, topic: t }))}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">¿Cuál es tu objetivo hoy?</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: "Explicación", value: "una explicación paso a paso" },
                    { label: "Práctica", value: "practicar con ejercicios" },
                    { label: "Prueba", value: "prepararme para una evaluación" },
                    { label: "Repaso", value: "hacer un repaso rápido" },
                    { label: "Desafío", value: "un desafío avanzado" },
                    { label: "Diagnóstico", value: "un diagnóstico para saber mi nivel" }
                  ].map((g) => (
                    <motion.div key={g.label} whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant={studentInfo.goal === g.value ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "w-full h-12 text-xs font-semibold rounded-xl transition-all duration-300",
                          studentInfo.goal === g.value ? "bg-blue-600 shadow-md shadow-blue-100" : "hover:bg-blue-50 border-slate-200"
                        )}
                        onClick={() => setStudentInfo(prev => ({ ...prev, goal: g.value }))}
                      >
                        {g.label}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-blue-200 mt-6 bg-blue-600 hover:bg-blue-700 transition-all duration-300 group"
                disabled={!studentInfo.grade || !studentInfo.topic || !studentInfo.confidence || !studentInfo.goal}
                onClick={handleStart}
              >
                Comenzar Sesión de Aprendizaje
                <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-100">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-lg leading-none tracking-tight">Tutoría Matemática</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[9px] px-2 h-5 font-black bg-blue-50 text-blue-700 border-blue-100 uppercase tracking-wider">
                {studentInfo.grade} Básico
              </Badge>
              <span className="text-slate-300 text-xs">•</span>
              <span className="text-[11px] font-bold text-slate-500 truncate max-w-[150px] uppercase tracking-wide">{studentInfo.topic}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={useThinking ? "default" : "outline"} 
            size="sm" 
            className="hidden md:flex rounded-full font-bold px-4 gap-2"
            onClick={() => setUseThinking(!useThinking)}
          >
            <Brain className={cn("w-4 h-4", useThinking ? "text-white" : "text-slate-600")} />
            Pensamiento
          </Button>
          <Button 
            variant={useSearch ? "default" : "outline"} 
            size="sm" 
            className="hidden md:flex rounded-full font-bold px-4 gap-2"
            onClick={() => setUseSearch(!useSearch)}
          >
            <Search className={cn("w-4 h-4", useSearch ? "text-white" : "text-slate-600")} />
            Búsqueda
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden md:flex rounded-full border-slate-200 text-slate-600 font-bold px-4"
            onClick={resetChat}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reiniciar
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden rounded-full"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <BookOpen className="w-5 h-5 text-slate-600" />
          </Button>
          <Separator orientation="vertical" className="h-8 mx-1 hidden md:block" />
          <div className="flex items-center gap-2.5 bg-green-50 px-4 py-2 rounded-full border border-green-100">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider">Tutor Pro</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat Area */}
        <main className="flex-1 overflow-hidden flex flex-col bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] bg-fixed">
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 scroll-smooth">
            <div className="max-w-3xl mx-auto space-y-10 pb-10">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn(
                      "flex gap-4",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xl transition-transform hover:scale-110",
                      msg.role === "user" ? "bg-slate-900 text-white rotate-2" : "bg-blue-600 text-white -rotate-2"
                    )}>
                      {msg.role === "user" ? <User className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
                    </div>
                    
                    <div className={cn(
                      "flex flex-col max-w-[85%] md:max-w-[80%]",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "p-6 rounded-[2rem] shadow-2xl border transition-all relative group/msg",
                        msg.role === "user" 
                          ? "bg-white border-slate-100 text-slate-800 rounded-tr-none" 
                          : "bg-blue-600 border-blue-500 rounded-tl-none text-white shadow-blue-200/40"
                      )}>
                        {msg.image && (
                          <img 
                            src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                            alt="Uploaded" 
                            className="max-w-full rounded-xl mb-3 border border-slate-200"
                          />
                        )}
                        {msg.visualAid && (
                          <img 
                            src={msg.visualAid} 
                            alt="Visual Aid" 
                            className="max-w-full rounded-xl mb-3 border border-white/20 shadow-lg"
                          />
                        )}
                        <div className={cn(
                          "markdown-body w-full",
                          msg.role === "model" ? "prose-invert" : ""
                        )}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.role === "model" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -right-12 top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity rounded-full bg-white shadow-sm border"
                            onClick={() => handlePlayTTS(msg.content)}
                          >
                            <Volume2 className="w-4 h-4 text-slate-600" />
                          </Button>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 mt-3 px-4 uppercase tracking-[0.15em] opacity-80">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex gap-4"
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg -rotate-3">
                    <Bot className="w-7 h-7 animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-tl-none shadow-xl flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                  </div>
                </motion.div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>
        </main>

        {/* Sidebar - Desktop & Toggleable Mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside 
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className="absolute lg:relative right-0 top-0 h-full w-80 border-l bg-white flex flex-col z-30 shadow-2xl lg:shadow-none"
            >
              <div className="p-6 border-b flex items-center justify-between bg-white">
                <h2 className="font-extrabold text-slate-900 flex items-center gap-3 text-[11px] uppercase tracking-[0.15em]">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Recursos de Apoyo
                </h2>
                <Button variant="ghost" size="icon" className="lg:hidden rounded-full h-8 w-8" onClick={() => setIsSidebarOpen(false)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 space-y-10">
                  <div className="space-y-5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] pl-1">Tips Rápidos</h3>
                    <div className="space-y-4">
                      {sidebarContent.tips.map((tip, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Card className={cn(
                            "border-none shadow-sm overflow-hidden rounded-2xl transition-all hover:shadow-md",
                            i % 2 === 0 ? "bg-blue-50/60" : "bg-amber-50/60"
                          )}>
                            <CardContent className="p-5 space-y-2">
                              <div className={cn(
                                "text-[9px] font-black uppercase tracking-[0.15em]",
                                i % 2 === 0 ? "text-blue-600" : "text-amber-600"
                              )}>
                                {tip.title}
                              </div>
                              <p className={cn(
                                "text-[13px] font-medium leading-relaxed",
                                i % 2 === 0 ? "text-blue-900/80" : "text-amber-900/80"
                              )}>
                                {tip.content}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] pl-1">Errores Comunes</h3>
                    <div className="space-y-4">
                      {sidebarContent.errors.map((err, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="group relative text-[13px] text-slate-600 flex gap-4 items-start bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-red-100 hover:bg-red-50/30 transition-all"
                        >
                          <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-black text-[10px] shadow-sm group-hover:scale-110 transition-transform">
                            !
                          </div>
                          <span className="font-semibold leading-relaxed pt-0.5">{err}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] pl-1">Ayuda Visual</h3>
                    <Button 
                      className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                      onClick={handleGenerateVisualAid}
                      disabled={isLoading}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Generar Esquema
                    </Button>
                  </div>

                  <Separator className="bg-slate-100/80" />

                  <div className="space-y-5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] pl-1">Preparación SIMCE</h3>
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-7 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                      <p className="text-[13px] font-bold leading-relaxed relative z-10 opacity-90">
                        "El razonamiento vale más que el cálculo. ¡Lee dos veces antes de marcar!"
                      </p>
                      <Sparkles className="absolute -right-8 -bottom-8 w-28 h-28 text-white/10 group-hover:rotate-45 transition-transform duration-1000" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t bg-white">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest">IA Pedagógica</div>
                    <div className="text-[9px] font-bold text-slate-400 leading-tight uppercase tracking-wide">
                      MDA 2025 • Chile
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <footer className="bg-white border-t p-4 md:p-6 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Compact Suggestions & Symbols */}
          {!isLoading && messages.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 no-scrollbar">
                {sidebarContent.suggested.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(s)}
                    className="whitespace-nowrap px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["+", "-", "×", "÷", "=", "≠", "≈", "√", "²", "³", "x", "y", "(", ")"].map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setInput(prev => prev + sym)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black text-slate-400 transition-colors border border-slate-100"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            {selectedImage && (
            <div className="mb-4 relative inline-block">
              <img 
                src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                alt="Selected" 
                className="h-20 w-20 object-cover rounded-xl border-2 border-blue-500"
              />
              <button 
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="icon"
              className="rounded-2xl h-16 w-16 shrink-0 border-slate-200 hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-6 h-6 text-slate-500" />
            </Button>
            <div className="relative flex-1 group">
              <Input
                placeholder="Escribe tu duda matemática aquí..."
                className="pr-14 py-8 text-lg rounded-[2rem] border-slate-200 focus-visible:ring-blue-500 shadow-inner bg-slate-50/50 focus:bg-white transition-all"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              />
              <div className="absolute right-3 bottom-3">
                <Button 
                  size="icon" 
                  className={cn(
                    "rounded-2xl h-12 w-12 shadow-xl transition-all duration-300 active:scale-90",
                    (input.trim() || selectedImage) ? "bg-blue-600 scale-100" : "bg-slate-300 scale-95"
                  )}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  onClick={handleSend}
                >
                  <Send className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-6">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2.5 opacity-70">
              <BookOpen className="w-3 h-3" />
              MDA 2025 • Bases Curriculares Chile
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
