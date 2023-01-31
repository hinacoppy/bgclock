// Backgammon Clock and Score board App 用 JavaScript
"use strict";

class BgClockApp {
  constructor(clockmode = true) {
    this.clockmode = clockmode;　//digital(T)/analog(F)
    this.flipcard = new FlipCard();
    this.setTimeOptions();
    this.setDomNames();
    this.setEventHandler();
    this.setSwipeEventHandler();
    this.themecolor = this.setThemeColor("cool");
    if (!this.clockmode) {
      this.cv1 = {}; //canvasで使うための状態を保持するオブジェクト
      this.cv2 = {};
      this.cv3 = {};
      this.init_canvas();
    }
    this.initVariables(true);
    this.settingVars = {}; //設定内容を保持するオブジェクト
    this.gyroEventHandleFunction = (e) => { this.gyroEventHandler(e); } //イベントハンドラ関数を変数化
    $(".analog").toggle(!this.clockmode); //長針表示チェックボックスはアナログ時計のときのみ表示
    if (BgUtil.isIOS()) { $(".vibration").hide(); } //iOSのときはバイブレーションの設定項目を表示しない
  }

  setTimeOptions() {
    $(".each").hide(); //最初は個別モードは非表示

    let mopt = "";
    for (let m = 0; m < 100; m++) {
      const selected = (m == 10) ? " selected" : "";
      mopt += "<option value='" + m + "'" + selected + ">" + ("00" + m).slice(-2) + "</option>";
    }
    $("#time1min, #time2min").append(mopt);

    let sopt = "";
    for (let s = 0; s < 60; s++) {
      const selected = (s == 0) ? " selected" : "";
      sopt += "<option value='" + s + "'" + selected + ">" + ("00" + s).slice(-2) + "</option>";
    }
    $("#time1sec, #time2sec").append(sopt);
  }

  //DOM定義
  setDomNames() {
    this.applybtn = $("#applybtn");
    this.applywoclkbtn = $("#applywoclkbtn");
    this.cancelbtn = $("#cancelbtn");
    this.settingbtn = $("#settingbtn");
    this.pausebtn = $("#pausebtn");
    this.settingwindow = $("#settingwindow");
    this.clockarea = this.clockmode ? $("#clock1, #clock2") : $("#clock1cv, #clock2cv");
    this.pauseinfo = $("#pauseinfo")
    this.matchlength = $("#matchlength");
    this.selminpoint = $("#selminpoint");
    this.seldelay = $("#delaytime");
    this.theme = $("#theme");
    this.timesetting = $("#timesetting");
    this.gyrochkbox = document.querySelector("#gyro");
  }

  //イベントハンドラの定義
  setEventHandler() {
    //設定画面の[APPLY]ボタンがクリックされたとき
    this.applybtn.on("click", () => {
      this.initVariables(true);
      this.flipcard.showMainPanel();
      this.settingmode = false;
    });

    //設定画面の[Apply wo Clock]ボタンがクリックされたとき
    this.applywoclkbtn.on("click", () => {
      this.initVariables(false);
      this.flipcard.showMainPanel();
      this.settingmode = false;
    });

    //設定画面の[CANCEL]ボタンがクリックされたとき
    this.cancelbtn.on("click", () => {
      this.flipcard.showMainPanel();
      this.loadSettingVars(); //transitionが終わってから書き戻す
      this.settingmode = false;
    });

    //メイン画面の[SETTINGS]ボタンがクリックされたとき
    this.settingbtn.on("click", () => {
      if (!this.pauseflg) { return; } //ポーズ時でなければ何もしない
      this.flipcard.showSettingPanel();
      this.saveSettingVars(); //元の値を覚えておく
      this.settingmode = true;
    });

    //メイン画面の[PAUSE] ボタンがクリックされたとき
    this.pausebtn.on("click", () => {
      this.pauseAction();
    });

    //クロックの場所がクリック(タップ)されたとき
    this.clockarea.on("touchstart mousedown", (e) => {
      e.preventDefault(); // touchstart以降のイベントを発生させない
      if (this.gyroflg) { //ジャイロモードのときはポーズボタンの機能
        this.pause_in();
        this.stopTimer();
        return; //elseを書かない
      }
      const targetid = this.clockmode ? e.currentTarget.id : e.currentTarget.parentElement.id;
      this.tapTimerAction(targetid);
    });

    //テーマが変更されたとき
    this.theme.on("change", () => {
      const theme = $("[name=theme]:checked").val();
      this.changeTheme(theme);
    });

    //マッチ情報が変更されたとき
    this.matchlength.on("change", () => { this.writeAllotedtime(); });
    this.selminpoint.on("change", () => { this.writeAllotedtime(); });

    //画面サイズが変更されたとき
    $(window).on("resize", () => {
      this.redraw();
    });

    //クロック設定モード情報が変更されたとき
    this.timesetting.on("change", () => {
      this.timesettingflg = ($('[name="timesetting"]:checked').val() == "comm");
      $(".comm").toggle( this.timesettingflg);
      $(".each").toggle(!this.timesettingflg);
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
      $("#delay" + player).show();
      $("#delay" + oppo).hide();
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
    this.soundflg = $("[name=sound]").prop("checked");
    this.vibrationflg = $("[name=vibration]").prop("checked");
    this.hourhandflg = $("[name=hourhand]").prop("checked");
    this.pauseflg = true; //pause状態で起動する
    this.timesettingflg = ($('[name="timesetting"]:checked').val() == "comm"); //T=comm, F=each
    this.clockplayer = 0; //手番をリセット
    this.timeoutflg = false;
    this.settingmode = false;
    this.delayInit = parseInt(this.seldelay.val());
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
      time1 = Number($("#time1min").val()) * 60 + Number($("#time1sec").val());
      time2 = Number($("#time2min").val()) * 60 + Number($("#time2sec").val());
    }
    this.clock = [0, time1, time2];

    this.dispTimer(1, time1, "pause");
    this.dispTimer(2, time2, "pause");
    if (this.clockmode) {
      $(".delay").hide();
      $(".clock").removeClass("timeupLose");
    } else {
      this.dispDelay(null, this.delayInit);
      this.pauseinfo.text("PAUSE").removeClass("timeupLose");
    }
  }

  //PLAY -> PAUSE
  pause_in() {
    this.pauseflg = true;
    this.settingbtn.removeClass("btndisable"); //ボタンクリックを有効化
    this.pauseinfo.show();
    if (this.clockmode) {
      this.pauseinfo.show();
      this.clockarea.removeClass("teban noteban").addClass("teban_pause"); //クロックを無手番に
    } else {
      this.pauseinfo.text("PAUSE");
      this.draw_timerframe(1, this.clock[1], "pause"); //クロックをPAUSE状態で表示
      this.draw_timerframe(2, this.clock[2], "pause");
      $("#clock1, #clock2").removeClass("teban noteban").addClass("teban_pause");
    }
  }

  //PAUSE -> PLAY
  pause_out() {
    this.pauseflg = false;
    this.pauseinfo.hide();
    this.settingbtn.addClass("btndisable"); //ボタンクリックを無効化
    const player = this.clockplayer;
    const oppo = BgUtil.getBdOppo(player); //手番じゃないほう
    $("#clock" + player).removeClass("noteban teban_pause").addClass("teban");
    $("#clock" + oppo).removeClass("teban teban_pause").addClass("noteban");
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
      $("#delay" + player).hide();
      const elapsed = timestamp - this.lasttimestamp;
      this.lasttimestamp = timestamp;

      this.clock[player] -= elapsed / 1000; //手番側の持ち時間を経過時間分減
      const clocktime = this.clock[player];
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
      $("#clock" + player).text("LOSE").addClass("timeupLose");
    } else {
      this.pauseinfo.text("TIMEUP LOSE").addClass("timeupLose");
    }
    this.sound_vibration("buzzer");
  }

  dispDelay(player, delay) {
    if (this.clockmode) {
      $("#delay" + player).text(delay);
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
      $("#clock" + player).text(timestr);
    } else {
      this.draw_timerframe(player, time, stat);
    }
  }

  get_allowtimemin() {
    const matchlength = parseInt(this.matchlength.val());
    const selminpoint = parseFloat(this.selminpoint.val());
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
    this.init_canvas();
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

  //canvasオブジェクト初期化
  init_canvas() {
    this.cv1.canvas = document.getElementById("clock1cv");
    this.cv1.ctx = this.cv1.canvas.getContext("2d");
    this.cv2.canvas = document.getElementById("clock2cv");
    this.cv2.ctx = this.cv2.canvas.getContext("2d");
    this.cv3.canvas = document.getElementById("delaycv");
    this.cv3.ctx = this.cv3.canvas.getContext("2d");
    this.cv1.width  = document.getElementById("clock1").clientWidth;
    this.cv1.height = document.getElementById("clock1").clientHeight;
    this.cv2.width  = document.getElementById("clock2").clientWidth;
    this.cv2.height = document.getElementById("clock2").clientHeight;
    this.cv3.width  = document.getElementById("delay").clientWidth;
    this.cv3.height = document.getElementById("delay").clientHeight;
  }

  //タイマーを表示
  draw_timerframe(player, timer, stat) {
    const cv = player == 1 ? this.cv1 : player == 2 ? this.cv2 : undefined;
    const s0 = Math.min(cv.width, cv.height); //小さいほう
    let s, backcolor;
    switch(stat) {
      case "pause":
        s = s0 * 1.0;
        backcolor = this.themecolor.back_pause;
        break;
      case "teban":
        s = s0 * 1.2; //手番のときはクロックを大きく表示
        backcolor = this.themecolor.back_teban;
        break;
      case "noteban":
        s = s0 * 0.9;
        backcolor = this.themecolor.back_noteban;
        break;
      default:
        backcolor = this.themecolor.back_alert;
    }

    const ctx = cv.ctx;
    const w = cv.canvas.width = s;
    const h = cv.canvas.height = s;
    const r = s/2; //半径
    const center = {x : r, y : r}; //中心
    const lh = r * 0.70; //時針長さ
    const lm = r * 0.80; //分針長さ
    const ls = r * 0.90; //秒針長さ
    const lr = r * 0.20; //針の後ろの長さ

    //背景
    ctx.fillStyle = backcolor;
    ctx.fillRect(0, 0, w, h);

    //外枠
    ctx.strokeStyle = this.themecolor.clock_border;
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, w - 1, h - 1);

    //描画開始位置を中心に移動
    ctx.translate(center.x, center.y);

    //分目盛
    ctx.save();
    ctx.strokeStyle = this.themecolor.dots_min;
    ctx.lineWidth = 2;
    ctx.beginPath();
      for (let i = 0; i < 60; i++){
        ctx.moveTo(r, 0);
        ctx.lineTo(r - 10, 0);
        ctx.rotate(Math.PI / 30);
      }
    ctx.stroke();

    //時目盛(5分毎)
    ctx.strokeStyle = this.themecolor.dots_hour;
    ctx.lineWidth = 3;
    ctx.beginPath();
      for (let i = 0; i < 12; i++){
        ctx.moveTo(r, 0);
        ctx.lineTo(r - 20, 0);
        ctx.rotate(Math.PI / 6);
      }
    ctx.stroke();
    ctx.restore();

    //針の設定
    //60ではなく、59.999にすることで、0秒、0分のとき0度になるようにする
    const sec = 59.9999 - (timer % 60);
    const min = Math.floor(59.9999 - ((timer % 3600) / 60));
    const hr = Math.floor(11.9999 - (timer / 3600));

    //時針(短針)
    if (this.hourhandflg) { //trueのとき表示、falseのとき非表示
      ctx.save();
      ctx.rotate((Math.PI / 6) * hr + (Math.PI / 360) * min + (Math.PI / 21600) * sec);
      ctx.lineWidth = 8;
      ctx.strokeStyle = this.themecolor.hour_hand;
      ctx.beginPath();
      ctx.moveTo(-3, lr);
      ctx.lineTo(0, -lh);
      ctx.lineTo(3, lr);
      ctx.stroke();
      ctx.restore();
    } // if (hourhandflg)

    //分針(長針)
    ctx.save();
    ctx.rotate((Math.PI / 30) * min + (Math.PI / 1800) * sec);
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.themecolor.min_hand;
    ctx.beginPath();
    ctx.moveTo(-2, lr);
    ctx.lineTo(0, -lm);
    ctx.lineTo(2, lr);
    ctx.stroke();
    ctx.restore();

    //秒針
    ctx.save();
    ctx.rotate(sec * Math.PI / 30);
    ctx.strokeStyle = this.themecolor.sec_hand;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, lr);
    ctx.lineTo(0, -ls);
    //ctx.lineTo(0, lr); //分針時針と同じコードにするが、無駄なのでコメントアウト
    ctx.stroke();
    ctx.restore();

    //時計の中心の丸
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.themecolor.center_stroke;
    ctx.fillStyle   = this.themecolor.center_fill;
    ctx.arc(0, 0, 7, 0, Math.PI * 2, true);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  //delayを表示
  draw_delayframe(delaytime, remain) {
    const cv = this.cv3;
    const ctx = cv.ctx;
    const w = cv.canvas.width = cv.width;
    const h = cv.canvas.height = cv.height;
    const r = (w > h ? h/2 : w/2); //半径は縦横の短いほうを選択

    ctx.clearRect(0, 0, w, h);

    //残delay時間
    const angle = 360 * ((delaytime - remain) / delaytime);

    //だんだん小さくなる円弧を描画
    ctx.beginPath();
    ctx.arc(w/2, h/2, r-1, (angle - 90) * Math.PI / 180, (360 - 90) * Math.PI / 180, false);
    ctx.lineTo(w/2, h/2);
    ctx.fillStyle = this.themecolor.delay_remain;
    ctx.fill();
    //だんだんおおきくなる円弧を描画
    ctx.beginPath();
    ctx.arc(w/2, h/2, r - 1, (angle - 90) * Math.PI / 180, (0 - 90) * Math.PI / 180, true);
    ctx.lineTo(w/2, h/2);
    ctx.fillStyle = this.themecolor.delay_used;
    ctx.fill();

    //外周
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r - 3, 0, Math.PI * 2, false); //外側divで削られないよう半径を調整
    ctx.strokeStyle = this.themecolor.delay_border;
    ctx.lineWidth = 5;
    ctx.stroke();
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
    //テーマに合わせてcanvasオブジェクトを再描画
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
