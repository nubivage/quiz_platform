
import { io } from 'socket.io-client';
import fs from 'node:fs';

const URL =
  process.env.BACKEND_URL ||
  'https://quiz-platform-backend-0s7r.onrender.com';

const N = Number(process.argv[2] || 5);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const timeoutMs = 180000;

const rows = [];
const clients = [];
let roomId;
let finished = false;
let questionCount = 0;
let startedAt;
let host;

function waitForEvent(socket, event, timeout = timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeout);

    function handler(data) {
      clearTimeout(timer);
      resolve(data);
    }

    socket.once(event, handler);
  });
}

function connectClient(nickname) {
  return new Promise((resolve, reject) => {
    const socket = io(URL, {
      reconnection: false,
      timeout: 15000
    });

    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
    clients.push(socket);
  });
}

async function main() {
  if (!Number.isInteger(N) || N < 1 || N > 50) {
    throw new Error('Choose between 1 and 50 simulated players.');
  }

  console.log(`Backend: ${URL}`);
  console.log(`Connecting ${N} simulated players...`);

  // Create a separate host connection.
  host = await connectClient('host');

  const roomPromise = waitForEvent(host, 'room_created');
  host.emit('create_room', { title: 'Load Test' });
  const room = await roomPromise;
  roomId = room.roomId;
  console.log(`Room created: ${roomId}`);

  // Connect and join every player before starting.
  const players = await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      const socket = await connectClient(`load-${i + 1}`);

      const joined = new Promise((resolve, reject) => {
        socket.emit(
          'join_room',
          { roomId, nickname: `load-${i + 1}` },
          response => {
            if (response?.ok) resolve(response);
            else reject(new Error(response?.error || 'Join failed'));
          }
        );
      });

      await joined;
      return socket;
    })
  );

  console.log(`All ${players.length} players joined.`);

  // Listen for questions before starting the quiz.
  const questionQueue = [];
  let wakeQuestion;

  function onQuestion(data) {
    questionQueue.push(data);
    if (wakeQuestion) {
      wakeQuestion();
      wakeQuestion = null;
    }
  }

  host.on('question_started', data => {
  console.log(
    `HOST received question ${data.index + 1}`
  );
  onQuestion(data);
});

  // Each simulated player answers once per question.
  for (const socket of players) {
    socket.on('question_started', question => {
  console.log(
    `Player ${socket.id} received question ${question.index + 1}`
  );

  const submittedAt = Date.now();

      setTimeout(() => {
        socket.emit(
          'submit_answer',
          {
            roomId,
            questionId: question.question.id,
            answerIndex: 0,
            clientSubmitTimestamp: submittedAt
          },
          response => {
            const receivedAt = Date.now();
            rows.push({
              question: question.question.id,
              latencyMs: receivedAt - submittedAt,
              success: Boolean(response?.ok),
              error: response?.ok ? '' : (response?.error || 'No acknowledgement')
            });
          }
        );
      }, 100);
    });
  }

  const finishedPromise = waitForEvent(host, 'quiz_finished')
  .then(() => {
    finished = true;
    console.log('Quiz finished event received.');
    return true;
  })
  .catch(error => {
    console.log('Waiting for quiz_finished failed:', error.message);
    return false;
  });

  startedAt = Date.now();

  host.emit('start_quiz', { roomId }, response => {
    if (!response?.ok) {
      console.error('Could not start quiz:', response?.error);
    }
  });

  // Wait for each question to end, then advance using the host.
  while (!finished) {
    if (questionQueue.length === 0) {
  await Promise.race([
    new Promise(resolve => {
      wakeQuestion = resolve;
    }),
    delay(timeoutMs).then(() => {
      throw new Error(
        `Timed out waiting for question ${questionCount + 1}`
      );
    })
  ]);
  wakeQuestion = null;
}

    if (questionQueue.length === 0) continue;

    const currentQuestion = questionQueue.shift();
questionCount++;

console.log(
  `Question ${questionCount} received. Starting test cycle...`
);

    // Wait for the question timer and answer acknowledgements.
    await delay(10500);

    const next = new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new Error(`No next_question acknowledgement for question ${questionCount}`));
  }, 15000);

  host.emit('next_question', { roomId }, response => {
    clearTimeout(timer);
    console.log('next_question response:', response);

    if (response?.ok) resolve(response);
    else reject(new Error(response?.error || 'Could not advance question'));
  });
});

await next;
console.log(`Question ${questionCount} advanced successfully.`);

    // A finished quiz will also emit quiz_finished.
    await Promise.race([finishedPromise, delay(100)]);
    if (questionCount > 30) throw new Error('Unexpected question count');
  }

  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const valid = rows.filter(row => row.success);
  const latencies = valid.map(row => row.latencyMs).sort((a, b) => a - b);

  const percentile = p =>
    latencies.length
      ? latencies[Math.min(latencies.length - 1, Math.ceil(p * latencies.length) - 1)]
      : null;

  const summary = {
    backend: URL,
    simulatedPlayers: N,
    questionsProcessed: questionCount,
    answerAttempts: rows.length,
    successfulAnswers: valid.length,
    failedAnswers: rows.length - valid.length,
    errorRatePercent: rows.length
      ? ((rows.length - valid.length) / rows.length) * 100
      : null,
    averageAcknowledgementLatencyMs: latencies.length
      ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
      : null,
    medianAcknowledgementLatencyMs: percentile(0.50),
    p95AcknowledgementLatencyMs: percentile(0.95),
    elapsedSeconds,
    successfulAnswersPerSecond: elapsedSeconds
      ? valid.length / elapsedSeconds
      : null
  };

  fs.mkdirSync('../results', { recursive: true });
  fs.writeFileSync(
    `../results/${N}-users.json`,
    JSON.stringify({ summary, events: rows }, null, 2)
  );
  fs.writeFileSync(
    `../results/${N}-users.csv`,
    'question,latencyMs,success,error\n' +
      rows.map(row =>
        `${row.question},${row.latencyMs},${row.success},${row.error}`
      ).join('\n')
  );

  console.log('\nLoad-test summary:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(error => {
    console.error('Load test failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const socket of clients) socket.disconnect();
    if (host) host.disconnect();
  });
