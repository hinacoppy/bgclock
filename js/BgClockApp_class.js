// Backgammon Clock and Score board App 用 JavaScript
"use strict";

class BgClockApp {
  constructor(clockmode = true) {
    this.clockmode = clockmode;　//digital(T)/analog(F)
    this.flipcard = new FlipCard();
    this.flipcard.resetScore();
    this.setTimeOptions(); //個別時間設定の<select>の<option>を設定
    this.setDomNames();
    this.setEventHandler();
    this.setSwipeEventHandler();
    this.themecolor = this.setThemeColor("cool");
    this.initVariables(false); //設定画面の設定を変数に取り込む。クロックの初期化はsvgの設定後
    if (!this.clockmode) {
      this.svg1 = {}; //SVGで使うための状態を保持するオブジェクト
      this.svg2 = {};
      this.svg3 = {};
      this.init_svg_object();
    }
    this.setClockOption(); //クロックを初期化
    this.settingVars = {}; //設定内容を保持するオブジェクト
    this.gyroEventHandleFunction = (e) => { this.gyroEventHandler(e); } //イベントハンドラ関数を変数化
    document.querySelectorAll(".analog").forEach((el) => { el.style.display = this.clockmode ? "none" : ""; }); //長針表示チェックボックスはアナログ時計のときのみ表示
    if (BgUtil.isIOS()) { document.querySelectorAll(".vibration").forEach((el) => { el.style.display = "none"; }); } //iOSのときはバイブレーションの設定項目を表示しない
  }

  setTimeOptions() {
    document.querySelectorAll(".each").forEach((el) => { el.style.display = "none"; }); //最初は個別モードは非表示

    let mopt = "";
    for (let m = 0; m < 100; m++) {
      const selected = (m == 10) ? " selected" : "";
      mopt += "<option value='" + m + "'" + selected + ">" + ("00" + m).slice(-2) + "</option>";
    }
    document.querySelectorAll("#time1min, #time2min").forEach((el) => { el.insertAdjacentHTML("beforeend", mopt); });

    let sopt = "";
    for (let s = 0; s < 60; s++) {
      const selected = (s == 0) ? " selected" : "";
      sopt += "<option value='" + s + "'" + selected + ">" + ("00" + s).slice(-2) + "</option>";
    }
    document.querySelectorAll("#time1sec, #time2sec").forEach((el) => { el.insertAdjacentHTML("beforeend", sopt); });
  }

  //DOM定義
  setDomNames() {
    this.applybtn      = document.querySelector("#applybtn");
    this.applywoclkbtn = document.querySelector("#applywoclkbtn");
    //this.cancelbtn     = document.querySelector("#cancelbtn");
    this.settingbtn    = document.querySelector("#settingbtn");
    this.pausebtn      = document.querySelector("#pausebtn");
    this.settingwindow = document.querySelector("#settingwindow");
    this.clockarea = this.clockmode
      ? [document.querySelector("#clock1"), document.querySelector("#clock2")]
      : [document.querySelector("#clock1svg"), document.querySelector("#clock2svg")];
    this.pauseinfo     = document.querySelector("#pauseinfo");
    this.matchlength   = document.querySelector("#matchlength");
    this.selminpoint   = document.querySelector("#selminpoint");
    this.seldelay      = document.querySelector("#delaytime");
    this.theme         = document.querySelector("#theme");
    this.timesetting   = document.querySelector("#timesetting");
    this.gyrochkbox    = document.querySelector("#gyro");
  }

  //イベントハンドラの定義
  setEventHandler() {
    //設定画面の[APPLY]ボタンがクリックされたとき
    this.applybtn.addEventListener("click", () => {
      this.initVariables(true);
      this.flipcard.showMainPanel();
      this.settingmode = false;
    });

    //設定画面の[Apply wo Clock]ボタンがクリックされたとき
    this.applywoclkbtn.addEventListener("click", () => {
      this.initVariables(false);
      this.flipcard.showMainPanel();
      this.settingmode = false;
    });

    /*****************************************************
    //設定画面の[CANCEL]ボタンがクリックされたとき(HTML側でコメントアウトされ現在は存在しない)
    this.cancelbtn.addEventListener("click", () => {
      this.flipcard.showMainPanel();
      this.loadSettingVars(); //transitionが終わってから書き戻す
      this.settingmode = false;
    });
    *****************************************************/

    //メイン画面の[SETTINGS]ボタンがクリックされたとき
    this.settingbtn.addEventListener("click", () => {
      if (!this.pauseflg) { return; } //ポーズ時でなければ何もしない
      this.flipcard.showSettingPanel();
      this.saveSettingVars(); //元の値を覚えておく
      this.settingmode = true;
    });

    //メイン画面の[PAUSE] ボタンがクリックされたとき
    this.pausebtn.addEventListener("click", () => {
      this.pauseAction();
    });

    //クロックの場所がクリック(タップ)されたとき
    const onClockPointerDown = (e) => {
      e.preventDefault(); // touchstart以降のイベントを発生させない
      if (this.gyroflg) { //ジャイロモードのときはポーズボタンの機能
        this.pause_in();
        this.stopTimer();
        return; //elseを書かない
      }
      const targetid = this.clockmode ? e.currentTarget.id : e.currentTarget.parentElement.id;
      this.tapTimerAction(targetid);
    };
    this.clockarea.forEach((el) => {
      el.addEventListener("touchstart", onClockPointerDown);
      el.addEventListener("mousedown", onClockPointerDown);
    });

    //テーマが変更されたとき
    this.theme.addEventListener("change", () => {
      const theme = document.querySelector('[name="theme"]:checked').value;
      this.changeTheme(theme);
    });

    //マッチ情報が変更されたとき
    this.matchlength.addEventListener("change", () => { this.writeAllotedtime(); });
    this.selminpoint.addEventListener("change", () => { this.writeAllotedtime(); });

    //画面サイズが変更されたとき
    window.addEventListener("resize", () => {
      this.redraw();
    });

    //クロック設定モード情報が変更されたとき
    this.timesetting.addEventListener("change", () => {
      this.timesettingflg = (document.querySelector('[name="timesetting"]:checked').value == "comm");
      document.querySelectorAll(".comm").forEach((el) => { el.style.display = this.timesettingflg ? "" : "none"; });
      document.querySelectorAll(".each").forEach((el) => { el.style.display = this.timesettingflg ? "none" : ""; });
    });

    //ジャイロモードのスイッチが変更されたとき
    this.gyrochkbox.addEventListener("change", () => {
      this.gyroflg = this.gyrochkbox.checked;
      if (this.gyroflg) {
        this.enableCheckGyro();
      } else {
        window.removeEventListener("deviceorientation", this.gyroEventHandleFunction);
      }
    });
  }

  setSwipeEventHandler() {
    this.score1 = document.querySelector("#score1");
    this.score2 = document.querySelector("#score2");

    //swipeイベントを登録
    const thres = Math.max(window.innerHeight, window.innerWidth) / 20;
    new SwipeTracker(this.score1, "tld", thres); //tapかswipeleft, swipedownを見張る。(ruはtapとみなす)
    new SwipeTracker(this.score2, "tld", thres);

    //スコアカードがスワイプあるいはタップされたとき→1枚めくる。スコアカードがめくれるのはポーズ時のみ
    const eventlist = ["mytap", "swipeleft", "swipedown"];
    for (const eventtype of eventlist) {
      this.score1.addEventListener(eventtype, (evt) => { if (this.pauseflg) { this.flipcard.driveEvent(evt); }});
      this.score2.addEventListener(eventtype, (evt) => { if (this.pauseflg) { this.flipcard.driveEvent(evt); }});
    }
  }

  enableCheckGyro() {
    if (window.DeviceOrientationEvent) {
      if (DeviceOrientationEvent.requestPermission) {
        //iPhone OS >= 13
        alert("ジャイロセンサーへのアクセス許可を申請"); //このalert()は冗長かもしれない
        DeviceOrientationEvent.requestPermission().then((response) => {
          if (response === "granted") {
            this.gyroflg = true;
            window.addEventListener("deviceorientation", this.gyroEventHandleFunction);
          } else {
            alert("ジャイロセンサーへのアクセスが拒否された");
            this.gyroflg = false;
            this.gyrochkbox.checked = false;
          }
        });
      } else {
        //Android or iPhone OS <= 12
        this.gyroflg = true;
        window.addEventListener("deviceorientation", this.gyroEventHandleFunction);
      }
    } else {
      alert("ジャイロセンサーが使用できない"); //PC等
      this.gyroflg = false;
      this.gyrochkbox.checked = false;
    }

    //ジャイロロジックで使う変数を定義・初期化
    this.last_beta = 1;
    this.lastActionTime = Date.now();
  }

  gyroEventHandler(e) {
    e.preventDefault();
    if (this.settingmode) { return; } //設定画面のときは何もしない
    const alfa = e.alfa; //使ってない
    const beta = e.beta;
    const gamma = e.gamma; //使ってない
    const absbeta = Math.abs(beta)
    if (3 < absbeta && absbeta < 8) { //傾きが既定の範囲内で、
      if (this.last_beta * beta < 0) { //水平を超えて傾けられたとき(前回と今回の角度の符号が逆)
        this.last_beta = beta;
        if (this.pauseflg) { //ポーズのときは短時間(<500ms)でフリックすることで、ポーズ解除とする
          const now = Date.now();
          if (now - this.lastActionTime < 500) {
            const targetid = (beta < 0) ? "clock1" : "clock2";
            this.tapTimerAction(targetid);
          } else {
            this.lastActionTime = now;
          }
        } else { //ポーズじゃないときは
          //スマホを左に傾けたとき(beta < 0)は、左側のクロックをタップしたことにする
          const targetid = (beta < 0) ? "clock1" : "clock2";
          this.tapTimerAction(targetid);
        }
      }
    }
  }

  //タイマ部分クリック時の処理
  tapTimerAction(targetid) {
    if (this.timeoutflg) { return; } //タイマ切れ状態のときは何もしない
    const tappos = Number(targetid.slice(-1));
    if (!this.pauseflg && this.clockplayer != tappos) { return; }
    //ポーズ時じゃないときに、相手側(グレーアウト側)をクリックしたときは何もしない

    this.clockplayer = BgUtil.getBdOppo(tappos); //タップの反対側のクロックを動かす
    const player = this.clockplayer;
    const oppo = BgUtil.getBdOppo(player);

    this.delay = this.delayInit; //保障時間を設定
    this.stopTimer(); //相手方のクロックをストップし
    this.startTimer(); //自分方のクロックをスタートさせる

    this.dispDelay(player, this.delay);
    if (this.clockmode) {
      document.querySelector("#delay" + player).style.display = "";
      document.querySelector("#delay" + oppo).style.display = "none";
    }

    this.pause_out();
    this.sound_vibration("tap");
  }

  //PAUSEボタン押下時の処理
  pauseAction() {
    if (this.clockplayer == 0 || this.timeoutflg) { return; } //どちらの手番でもない or タイマ切れのときは何もしない
    if (this.pauseflg) { //PAUSE -> PLAY
      this.pause_out();
      this.startTimer(); //現在の持ち時間からクロック再開
    } else { //PLAY -> PAUSE
      this.pause_in();
      this.stopTimer();
    }
    this.sound_vibration("pause");
  }

  //設定画面で設定した内容を反映
  initVariables(applyflg) {
    this.soundflg = document.querySelector('[name="sound"]').checked;
    this.vibrationflg = document.querySelector('[name="vibration"]').checked;
    this.hourhandflg = document.querySelector('[name="hourhand"]').checked;
    this.pauseflg = true; //pause状態で起動する
    this.timesettingflg = (document.querySelector('[name="timesetting"]:checked').value == "comm"); //T=comm, F=each
    this.clockplayer = 0; //手番をリセット
    this.timeoutflg = false;
    this.settingmode = false;
    this.delayInit = parseInt(this.seldelay.value);
    this.flipcard.showMatchInfo();
    if (applyflg) {
      this.flipcard.resetScore();
      this.setClockOption();
    }
    this.lasttimestamp = 0;
  }

  setClockOption() {
    let time1, time2;
    if (this.timesettingflg) {
      time1 = time2 = 60 * this.get_allowtimemin(); //設定時間 = ポイント数 x 時間(分) x 60(秒)
    } else {
      time1 = Number(document.querySelector("#time1min").value) * 60 + Number(document.querySelector("#time1sec").value);
      time2 = Number(document.querySelector("#time2min").value) * 60 + Number(document.querySelector("#time2sec").value);
    }
    this.clock = [0, time1, time2];

    this.dispTimer(1, time1, "pause");
    this.dispTimer(2, time2, "pause");
    if (this.clockmode) {
      document.querySelectorAll(".delay").forEach((el) => { el.style.display = "none"; });
      document.querySelectorAll(".clock").forEach((el) => { el.classList.remove("timeupLose"); });
    } else {
      this.dispDelay(null, this.delayInit);
      this.pauseinfo.textContent = "PAUSE";
      this.pauseinfo.classList.remove("timeupLose");
    }
  }

  //PLAY -> PAUSE
  pause_in() {
    this.pauseflg = true;
    this.settingbtn.classList.remove("btndisable"); //ボタンクリックを有効化
    this.pauseinfo.style.display = "";
    if (this.clockmode) {
      this.pauseinfo.style.display = "";
      this.clockarea.forEach((el) => { el.classList.remove("teban", "noteban"); el.classList.add("teban_pause"); }); //クロックを無手番に
    } else {
      this.pauseinfo.textContent = "PAUSE";
      this.draw_timerframe(1, this.clock[1], "pause"); //クロックをPAUSE状態で表示
      this.draw_timerframe(2, this.clock[2], "pause");
      document.querySelectorAll("#clock1, #clock2").forEach((el) => { el.classList.remove("teban", "noteban"); el.classList.add("teban_pause"); });
    }
  }

  //PAUSE -> PLAY
  pause_out() {
    this.pauseflg = false;
    this.pauseinfo.style.display = "none";
    this.settingbtn.classList.add("btndisable"); //ボタンクリックを無効化
    const player = this.clockplayer;
    const oppo = BgUtil.getBdOppo(player); //手番じゃないほう
    const clockPlayerEl = document.querySelector("#clock" + player);
    clockPlayerEl.classList.remove("noteban", "teban_pause");
    clockPlayerEl.classList.add("teban");
    const clockOppoEl = document.querySelector("#clock" + oppo);
    clockOppoEl.classList.remove("teban", "teban_pause");
    clockOppoEl.classList.add("noteban");
    if (!this.clockmode) {
      this.draw_timerframe(player, this.clock[player], "teban");
      this.draw_timerframe(oppo, this.clock[oppo], "noteban");
    }
  }

  startTimer() {
    this.frameID = window.requestAnimationFrame(() => { this.countdownClock(); });
  }

  stopTimer() {
    window.cancelAnimationFrame(this.frameID);
    this.frameID = undefined; //不要だが分かりやすさのために残しておく
  }

  //クロックをFrame Ratio(約16msec)でカウントダウン
  countdownClock(timestamp) {
    if (this.frameID === undefined) { return; } //クロックが止まっているときは何もしない

    if (timestamp === undefined) {
      this.lasttimestamp = timestamp = performance.now(); //最初に呼ばれたときはリセット
    }

    const player = this.clockplayer;
    if (this.delay > 0) { //保障時間内
      const delaystep = 1000; //delayの更新間隔は1000msec
      if (timestamp - this.lasttimestamp > delaystep) { //delaystep以上経過したら、
        this.delay -= 1;
        this.dispDelay(player, this.delay);
        this.lasttimestamp += delaystep; //誤差を吸収して次の判断時刻を設定
      }
    } else { //保障時間切れ後
      if (this.clockmode) { //ディレイを消すのはデジタルのときだけ
        document.querySelector("#delay" + player).style.display = "none";
      }
      const elapsed = timestamp - this.lasttimestamp;
      this.lasttimestamp = timestamp;

      const clocktime = this.clock[player] - elapsed / 1000; //手番側の持ち時間を経過時間分減
      this.clock[player] = Math.max(clocktime, 0); //持ち時間はマイナスにはしない
      const clockstep = (clocktime > 60) ? 1000 : 100; //残60秒を切ったら 0.1秒毎に表示を更新
      const clockmod = (clocktime * 1000) % clockstep;
      if (clockmod - elapsed < 0) { //次が桁下がりのときに表示
        this.dispTimer(player, clocktime, "teban");
        if (clocktime <= 0) {
          this.stopTimer();
          this.timeupLose(player); //切れ負け処理
          return; //次のrequestAnimationFrame()を実行させない
        }
      }
    }
    this.frameID = window.requestAnimationFrame((timestamp) => { this.countdownClock(timestamp); });
  }

  //切れ負け処理
  timeupLose(player) {
    this.timeoutflg = true;
    this.pause_in(); //ポーズ状態に遷移
    if (this.clockmode) {
      const clockEl = document.querySelector("#clock" + player);
      clockEl.textContent = "LOSE";
      clockEl.classList.add("timeupLose");
    } else {
      this.pauseinfo.textContent = "TIMEUP LOSE";
      this.pauseinfo.classList.add("timeupLose");
    }
    this.sound_vibration("buzzer");
  }

  dispDelay(player, delay) {
    if (this.clockmode) {
      document.querySelector("#delay" + player).textContent = delay;
    } else {
      this.draw_delayframe(this.delayInit, delay);
    }
  }

  dispTimer(player, time, stat) {
    if (this.clockmode) {
      if (time < 0) { time = 0; }
      let timestr;
      if (time >= 60) {
        const min = Math.trunc(time / 60);
        const sec = Math.trunc(time % 60);
        timestr = ("00" + min).slice(-2) + ":" + ("00" + sec).slice(-2);
      } else {
        const sec = Math.trunc(time % 60);
        const msec = Math.trunc(time * 10) * 10 % 100; //10msecの桁を0に固定
        //const msec = Math.trunc(time * 100) % 100; //10msecの桁を動かす場合
        timestr = ("00" + sec).slice(-2) + ":" + ("00" + msec).slice(-2);
      }
      document.querySelector("#clock" + player).textContent = timestr;
    } else {
      this.draw_timerframe(player, time, stat);
    }
  }

  get_allowtimemin() {
    const matchlength = parseInt(this.matchlength.value);
    const selminpoint = parseFloat(this.selminpoint.value);
    const maxmin = this.clockmode ? 100 : 720; //analogの最大値は720分(12時間)
    const time = (matchlength == 0) ? maxmin : Math.ceil(matchlength * selminpoint);
    return time;
  }

//以下の行はjQueryコード削除済

  writeAllotedtime() {
    document.querySelector("#allotedtime").textContent = this.get_allowtimemin()
  }

  //音とバイブレーション
  sound_vibration(type) {
    this.sound(type);
    this.vibration(type);
  }

  //音を鳴らす
  sound(type) {
    if (this.soundflg) {
      const audio = document.getElementById(type); //音の種類は引数で指定
      audio.play();
    }
  }

  //バイブレーション
  vibration(type) {
    if (this.vibrationflg) {
      const vibrationdata = {tap: 50, pause: [50, 50, 100], buzzer: 1000};
      window.navigator.vibrate(vibrationdata[type]);
    }
  }

  //windowリサイズ時にアナログ時計を描き直す
  redraw() {
    if (this.clockmode) { return; } //以下の処理はanalogの時のみ
    //this.init_svg_object();
    //return; //時計再描画は次回描画時に
    if (this.pauseflg) {
      this.draw_timerframe(1, this.clock[1], "pause");
      this.draw_timerframe(2, this.clock[2], "pause");
    } else {
      const play = this.clockplayer;
      const oppo = BgUtil.getBdOppo(this.clockplayer);
      this.draw_timerframe(play, this.clock[play], "teban");
      this.draw_timerframe(oppo, this.clock[oppo], "noteban");
    }
    this.draw_delayframe(this.delayInit, this.delay);
  }

  //SVGオブジェクト初期化
  init_svg_object() {
    this.init_svg_clock(this.svg1, "clock1svg");
    this.init_svg_clock(this.svg2, "clock2svg");
    this.init_svg_delay(this.svg3, "delaysvg");
  }

  init_svg_clock(svgobj, domid) {
    svgobj.svg = document.getElementById(domid);
    svgobj.svg.innerHTML = "";
    svgobj.svg.setAttribute("viewBox", `-500 -500 1000 1000`);
    svgobj.svg.setAttribute("width", "30vw");
    svgobj.container = this.createGroupRotate90(svgobj.svg, 'conntainer');
    svgobj.container.setAttribute("fill", this.themecolor.back_pause);
    this.createClockSotowaku(svgobj.container, -500, -500, 1000, 1000, this.themecolor.clock_border);
    this.createClockMemori(svgobj.container);
    svgobj.Tanshin = this.createTanshin(svgobj.container);
    svgobj.Choshin = this.createChoshin(svgobj.container);
    svgobj.Byoshin = this.createByoshin(svgobj.container);
    this.createCap(svgobj.container);

    const visibility = this.hourhandflg ? "visible" : "hidden"; //短針の表示/非表示
    svgobj.Tanshin.setAttribute("visibility", visibility);
  }

  init_svg_delay(svgobj, domid) {
    svgobj.svg = document.getElementById(domid);
    svgobj.svg.innerHTML = "";
    svgobj.svg.setAttribute("viewBox", `-100 -100 200 200`);
    svgobj.svg.setAttribute("width", "15vw");

    //外周と消費時間の塗りつぶし
    const radius = 97;
    const borderwidth = 5;
    const d = "M 0 0 h 95 a 95 95 0 0 1 0 0 z"; //初期状態の扇型
    const g = this.createGroupRotate90(svgobj.svg, 'delay');
    this.createDelayCircle(g, 0, 0, radius, this.themecolor.delay_remain, this.themecolor.delay_border, borderwidth);
    svgobj.Path = this.createDelayOogigata(g, d, this.themecolor.delay_used);
  }

  //タイマーを表示
  draw_timerframe(player, timer, stat) {
    const svgobj = player == 1 ? this.svg1 : player == 2 ? this.svg2 : undefined;

    let backcolor, width;
    switch(stat) {
      case "pause":
        width = "30vw";
        backcolor = this.themecolor.back_pause;
        break;
      case "teban":
        width = "36vw";
        backcolor = this.themecolor.back_teban;
        break;
      case "noteban":
        width = "27vw";
        backcolor = this.themecolor.back_noteban;
        break;
      default:
        width = "30vw";
        backcolor = this.themecolor.back_alert;
    }
    svgobj.svg.setAttribute("width", width); //サイズと色を変える
    svgobj.container.setAttribute("fill", backcolor);

    //針の設定
    const [hh, mm, ss, ms] = this.parse_timer(timer); //timerを時分秒に分解
    const hhdegree = 360 - (30 * (hh + (1/60) * mm)); //角度計算
    const mmdegree = 360 - (6 * (mm + (1/60) * ss));
    const ssdegree = 360 - (6 * (ss + (timer < 60 ? ms : 0))); //残60秒以下のときはミリ秒まで表示
    svgobj.Tanshin.setAttribute("transform", `rotate(${hhdegree})`);
    svgobj.Choshin.setAttribute("transform", `rotate(${mmdegree})`);
    svgobj.Byoshin.setAttribute("transform", `rotate(${ssdegree})`);
  }

  //delayを表示
  draw_delayframe(delaytime, remain) {
    if (delaytime == 0) { return; }
    //だんだん小さくなる円弧を描画
    const angle = 360 * ((delaytime - remain) / delaytime); //残delay時間
    const r = 95;
    const dx = r * (this.cos(angle) - 1); //1 = Math.cos(0);
    const dy = r * (this.sin(angle) - 0); //0 = Math.sin(0);
    const xar = 0; //x-axis-rotation
    const laf = (angle > 180) ? 1 : 0; //large-arc-flag
    const sf = 1; //sweep-flag
    const d = `M 0 0 h ${r} a ${r} ${r} ${xar} ${laf} ${sf} ${dx} ${dy} z`;
    this.svg3.Path.setAttribute("d", d);
  }

  parse_timer(timer) {
    let work = timer;
    const ms = work % 1;
    work = Math.floor(work);
    const ss = work % 60;
    work = Math.floor(work / 60);
    const mm = work % 60;
    work = Math.floor(work / 60);
    const hh = work;
    return [hh, mm, ss, ms];
  }

  sin(degree) {
    return Math.sin(degree * (Math.PI / 180)); //radian = degree * (2π / 360)
  }

  cos(degree) {
    return Math.cos(degree * (Math.PI / 180));
  }

  createGroupRotate90(svg, className) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", className);
    g.setAttribute("transform", "rotate(-90)");
    svg.appendChild(g);
    return g;
  }

  createTanshin(svg) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "tanshin");
    g.setAttribute("transform", "rotate(0)");
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const points = "350,10 350,-10 -80,-15 -80,15";
    polygon.setAttribute("points", points);
    polygon.setAttribute("fill", this.themecolor.hour_hand);
    g.appendChild(polygon);
    svg.appendChild(g);
    return g;
  }

  createChoshin(svg) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "choshin");
    g.setAttribute("transform", "rotate(0)");
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const points = "420,5 420,-5 -80,-8 -80,8";
    polygon.setAttribute("points", points);
    polygon.setAttribute("fill", this.themecolor.min_hand);
    g.appendChild(polygon);
    svg.appendChild(g);
    return g;
  }

  createByoshin(svg) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "byoshin");
    g.setAttribute("transform", "rotate(0)");
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const points = "470,3 470,-3 -80,-3 -80,3";
    polygon.setAttribute("points", points);
    polygon.setAttribute("fill", this.themecolor.sec_hand);
    g.appendChild(polygon);
    svg.appendChild(g);
    return g;
  }

  createCap(svg) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "cap");
    circle.setAttribute("cx", 0);
    circle.setAttribute("cy", 0);
    circle.setAttribute("r", 30);
    circle.setAttribute("fill", this.themecolor.center_fill);
    svg.appendChild(circle);
  }

  createClockMemori(svg) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "memori");
    for (let m = 0; m < 60; m++) {
      const color = (m % 5 == 0) ? this.themecolor.dots_hour : this.themecolor.dots_min;
      const length = (m % 5 == 0) ? 40 : 20;
      const width = (m % 5 == 0) ? 10 : 7;
      const degree = m * 6;
      const r1 = 500;
      const r2 = r1 - length;
      const x1 = r1 * this.sin(degree);
      const x2 = r2 * this.sin(degree);
      const y1 = r1 * this.cos(degree);
      const y2 = r2 * this.cos(degree);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", width);
      g.appendChild(line);
    }
    svg.appendChild(g);
  }

  createClockSotowaku(svg, x, y, width, height, border) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "sotowaku");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("stroke", border); // 縁取りの色
    rect.setAttribute("stroke-width", 10); // 縁取りの幅
    svg.appendChild(rect);
  }

  createDelayCircle(svg, cx, cy, r, fill, border, width) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", fill);
    circle.setAttribute("stroke", border); // 縁取りの色
    circle.setAttribute("stroke-width", width); // 縁取りの幅
    svg.appendChild(circle);
  }

  createDelayOogigata(svg, d, fill) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", fill);
    svg.appendChild(path);
    return path;
  }

  saveSettingVars() {
    this.settingVars.matchlength = document.querySelector("#matchlength").value;
    this.settingVars.selminpoint = document.querySelector("#selminpoint").value;
    this.settingVars.delaytime   = document.querySelector("#delaytime").value;
    this.settingVars.sound       = document.querySelector("#sound").checked;
    this.settingVars.vibration   = document.querySelector("#vibration").checked;
    this.settingVars.hourhand    = document.querySelector("#hourhand").checked;
    this.settingVars.time1min    = document.querySelector("#time1min").value;
    this.settingVars.time1sec    = document.querySelector("#time1sec").value;
    this.settingVars.time2min    = document.querySelector("#time2min").value;
    this.settingVars.time2sec    = document.querySelector("#time2sec").value;
    this.settingVars.timesetting = this.getTimesettingIndex();
  }

  loadSettingVars() {
    document.querySelector("#matchlength").value = this.settingVars.matchlength;
    document.querySelector("#selminpoint").value = this.settingVars.selminpoint;
    document.querySelector("#delaytime").value   = this.settingVars.delaytime;
    document.querySelector("#sound").checked     = this.settingVars.sound;
    document.querySelector("#vibration").checked = this.settingVars.vibration;
    document.querySelector("#hourhand").checked  = this.settingVars.hourhand;
    document.querySelector("#time1min").value    = this.settingVars.time1min;
    document.querySelector("#time1sec").value    = this.settingVars.time1sec;
    document.querySelector("#time2min").value    = this.settingVars.time2min;
    document.querySelector("#time2sec").value    = this.settingVars.time2sec;
    document.querySelector("#allotedtime").textContent = this.get_allowtimemin();
    document.getElementsByName("timesetting")[this.settingVars.timesetting].checked = true;
    document.querySelector("#timesetting").dispatchEvent(new Event("change")); //changeイベントを発火し表示を戻す
  }

  getTimesettingIndex() {
    const elemlist = document.getElementsByName("timesetting");
    for (let idx = 0; idx < elemlist.length; idx++) {
      if (elemlist[idx].checked) {
        return idx;
      }
    }
  }

  //テーマカラーを変更
  changeTheme(theme) {
    const body = document.querySelector("body");
    body.classList.remove("warm", "cool", "mono");
    body.classList.add(theme);
    if (this.clockmode) { return; } //以下の処理はanalog時のみ

    this.themecolor = this.setThemeColor(theme);
    //テーマに合わせてSVGオブジェクトを再描画
    this.init_svg_object();
    this.draw_timerframe(1, this.clock[1], "pause");
    this.draw_timerframe(2, this.clock[2], "pause");
    this.draw_delayframe(this.delayInit, this.delay);
  }

  setThemeColor(theme) {
    let themecolor = {};
    switch (theme) {
    case "cool":
      themecolor.back_pause   = "#abd";
      themecolor.back_teban   = "#fff";
      themecolor.back_noteban = "#abe";
      themecolor.back_alert   = "#f00";
      themecolor.clock_border = "#007";
      themecolor.dots_min     = "#333";
      themecolor.dots_hour    = "#388";
      themecolor.hour_hand    = "#148";
      themecolor.min_hand     = "#000";
      themecolor.sec_hand     = "#26b";
      themecolor.center_fill  = "#376";
      themecolor.center_stroke= "#26b";
      themecolor.delay_remain = "#26b";
      themecolor.delay_used   = "#efe";
      themecolor.delay_border = "#148";
      break;
    case "warm":
      themecolor.back_pause   = "#c95";
      themecolor.back_teban   = "#fff";
      themecolor.back_noteban = "#ca6";
      themecolor.back_alert   = "#f00";
      themecolor.clock_border = "#322";
      themecolor.dots_min     = "#bbe";
      themecolor.dots_hour    = "#bcc";
      themecolor.hour_hand    = "#722";
      themecolor.min_hand     = "#000";
      themecolor.sec_hand     = "#943";
      themecolor.center_fill  = "#e60";
      themecolor.center_stroke= "#e63";
      themecolor.delay_remain = "#943";
      themecolor.delay_used   = "#fee";
      themecolor.delay_border = "#722";
      break;
    case "mono":
      themecolor.back_pause   = "#ccc";
      themecolor.back_teban   = "#fff";
      themecolor.back_noteban = "#ccc";
      themecolor.back_alert   = "#f00";
      themecolor.clock_border = "#000";
      themecolor.dots_min     = "#333";
      themecolor.dots_hour    = "#111";
      themecolor.hour_hand    = "#555";
      themecolor.min_hand     = "#000";
      themecolor.sec_hand     = "#777";
      themecolor.center_fill  = "#555";
      themecolor.center_stroke= "#222";
      themecolor.delay_remain = "#777";
      themecolor.delay_used   = "#eee";
      themecolor.delay_border = "#555";
      break;
    }
    return themecolor;
  }
}
