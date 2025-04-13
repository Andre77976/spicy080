const WebSocket = require("ws");

const token = "xlslatUHAYZrGKY"; // teu token
const ws = new WebSocket("wss://ws.deriv.com/websockets/v3?app_id=1089");

let authorized = false;
let activeTrade = false;
let lossCount = 0;
let stake = 2;
const maxLosses = 5;
const targetProfit = 20;
let profit = 0;

ws.onopen = () => {
  console.log("Conectado à Deriv WebSocket");

  ws.send(
    JSON.stringify({
      authorize: token,
    })
  );
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.msg_type === "authorize") {
    console.log("Autorizado com sucesso!");
    authorized = true;
    subscribeTicks();
  }

  if (data.msg_type === "tick") {
    const digit = parseInt(data.tick.quote.slice(-1));
    console.log("Último dígito:", digit);
    updateDigits(digit);
  }

  if (data.msg_type === "buy") {
    console.log("Compra feita:", data.buy.purchase_id);
  }

  if (data.msg_type === "proposal_open_contract") {
    const status = data.proposal_open_contract.status;
    if (status === "won") {
      console.log("Ganhou!");
      profit += stake;
      stake = 2;
      activeTrade = false;
    } else if (status === "lost") {
      console.log("Perdeu!");
      profit -= stake;
      stake *= 2;
      lossCount++;
      activeTrade = false;
    }

    if (profit >= targetProfit || lossCount >= maxLosses) {
      console.log("Sessão encerrada. Lucro:", profit);
      ws.close();
    }
  }
};

let recentDigits = [];

function updateDigits(d) {
  recentDigits.push(d);
  if (recentDigits.length > 50) recentDigits.shift();

  const freq = recentDigits.reduce((acc, digit) => {
    acc[digit] = (acc[digit] || 0) + 1;
    return acc;
  }, {});

  const highFreq = [5, 6, 7, 8, 9].filter((n) => (freq[n] || 0) >= 6);

  if (highFreq.length >= 2 && !activeTrade) {
    buyContract();
  }
}

function buyContract() {
  activeTrade = true;
  ws.send(
    JSON.stringify({
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: "stake",
        contract_type: "DIGITOVER",
        currency: "USD",
        duration: 1,
        duration_unit: "t",
        symbol: "R_100",
        barrier: 4,
      },
    })
  );
}

function subscribeTicks() {
  ws.send(
    JSON.stringify({
      ticks: "R_100",
      subscribe: 1,
    })
  );
}
