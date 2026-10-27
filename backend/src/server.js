require('dotenv').config();
const express=require('express'); const http=require('http'); const cors=require('cors'); const {Server}=require('socket.io');
const {createRepository}=require('./store'); const {questions}=require('./questions');
const app=express(); 
app.get('/debug-runtime', (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch
  });
});
app.use(cors({origin:process.env.CORS_ORIGIN?.split(',')||'*'})); app.get('/health',(req,res)=>res.json({status:'ok'}));
const server=http.createServer(app); const io=new Server(server,{cors:{origin:process.env.CORS_ORIGIN?.split(',')||'*',methods:['GET','POST']}}); const db=createRepository();
const rooms=new Map();
const now=()=>Date.now(); const roomCode=()=>Math.random().toString(36).slice(2,8).toUpperCase();
function safePlayers(r){return [...r.players.values()].map(p=>({id:p.id,nickname:p.nickname,score:p.score}));}
function emitLeaderboard(r){io.to(r.id).emit('leaderboard_updated',{leaderboard:safePlayers(r).sort((a,b)=>b.score-a.score)});}
function endQuestion(r){if(!r || r.state!=='RUNNING' || !r.active) return; r.active=false; const q=r.questions[r.index]; io.to(r.id).emit('question_ended',{questionId:q.id,correctAnswer:q.correctAnswer,endedAt:now()}); emitLeaderboard(r); db.saveRoom(r);}
function startQuestion(r){const q=r.questions[r.index]; r.active=true; r.questionBroadcastTimestamp=now(); r.answers.clear(); r.answerCount=0; io.to(r.id).emit('question_started',{question:{id:q.id,question:q.question,options:q.options,timeLimit:q.timeLimit},serverTimestamp:r.questionBroadcastTimestamp,index:r.index,totalQuestions:r.questions.length}); clearTimeout(r.timer); r.timer=setTimeout(()=>endQuestion(r),q.timeLimit*1000);}
io.on('connection',socket=>{
 socket.on('create_room',({title},ack)=>{const id=roomCode(); const r={id,title:title?.trim()||'Research Quiz',state:'WAITING',hostId:socket.id,players:new Map(),questions, index:0,active:false,answers:new Set(),answerCount:0,timer:null}; rooms.set(id,r); socket.join(id); db.saveRoom(r); socket.emit('room_created',{roomId:id,title:r.title}); ack?.({ok:true,roomId:id});});
 socket.on('join_room',({roomId,nickname},ack)=>{const r=rooms.get(String(roomId||'').toUpperCase()); if(!r)return ack?.({ok:false,error:'Room not found'}); if(r.state==='FINISHED')return ack?.({ok:false,error:'Quiz already finished'}); if(r.players.size>=200)return ack?.({ok:false,error:'Room is full'}); if(!nickname?.trim())return ack?.({ok:false,error:'Nickname required'}); const p={id:socket.id,nickname:nickname.trim().slice(0,24),score:0,answered:false}; r.players.set(socket.id,p); socket.join(r.id); socket.data.roomId=r.id; socket.data.role='PLAYER'; socket.emit('room_created',{roomId:r.id,title:r.title}); io.to(r.id).emit('player_joined',{players:safePlayers(r),player:{id:p.id,nickname:p.nickname}}); ack?.({ok:true,roomId:r.id,players:safePlayers(r)});});
 socket.on('start_quiz',({roomId},ack)=>{const r=rooms.get(roomId); if(!r||r.hostId!==socket.id)return ack?.({ok:false,error:'Only host can start'}); if(r.state!=='WAITING')return ack?.({ok:false,error:'Quiz already started'}); r.state='RUNNING'; io.to(r.id).emit('quiz_started',{startedAt:now()}); startQuestion(r); ack?.({ok:true});});
 socket.on('submit_answer',({roomId,questionId,answerIndex,clientSubmitTimestamp},ack)=>{const r=rooms.get(roomId),p=r?.players.get(socket.id); const received=now(); if(!r||!p)return ack?.({ok:false,error:'Not in room'}); if(r.state!=='RUNNING'||!r.active)return ack?.({ok:false,error:'Question is not active',serverReceivedTimestamp:received}); if(r.questions[r.index].id!==questionId)return ack?.({ok:false,error:'Stale question',serverReceivedTimestamp:received}); if(r.answers.has(socket.id))return ack?.({ok:false,error:'Answer already submitted',serverReceivedTimestamp:received}); const q=r.questions[r.index]; const correct=Number(answerIndex)===q.correctAnswer; if(correct)p.score+=100; r.answers.add(socket.id); r.answerCount++; const payload={success:true,correct,score:p.score,answerAcknowledgementTimestamp:received,clientSubmitTimestamp}; socket.emit('answer_received',payload); io.to(r.id).emit('answer_received',{playerId:p.id,answerCount:r.answerCount,totalPlayers:r.players.size}); if(r.answerCount===r.players.size)endQuestion(r); ack?.({ok:true,...payload}); db.saveRoom(r);});
 socket.on('next_question',({roomId},ack)=>{const r=rooms.get(roomId); if(!r||r.hostId!==socket.id)return ack?.({ok:false,error:'Only host can advance'}); endQuestion(r); if(r.index>=r.questions.length-1){r.state='FINISHED'; const leaderboard=safePlayers(r).sort((a,b)=>b.score-a.score); db.saveResults(r,leaderboard); io.to(r.id).emit('quiz_finished',{leaderboard}); return ack?.({ok:true,finished:true});} r.index++; startQuestion(r); ack?.({ok:true});});
 socket.on('leave_room',({roomId})=>leave(socket,roomId));
 socket.on('disconnect',()=>{if(socket.data.roomId)leave(socket,socket.data.roomId)});
});
function leave(socket,roomId){const r=rooms.get(roomId); if(!r)return; if(r.hostId===socket.id){r.state='FINISHED'; io.to(r.id).emit('quiz_finished',{leaderboard:safePlayers(r).sort((a,b)=>b.score-a.score)}); rooms.delete(r.id); return;} r.players.delete(socket.id); io.to(r.id).emit('player_left',{players:safePlayers(r),playerId:socket.id});}
const PORT=process.env.PORT||3000; server.listen(PORT,()=>console.log(`Backend listening on ${PORT}`));
