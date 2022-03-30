// Backgammon Clock and Score board App 用 JavaScript
"use strict";

class BgClockApp {
  constructor(clockmode = true) {
    this.clockmode = clockmode;　//digital(T)/analog(F)
    this.flipcard = new FlipCard();
    this.setDomNames();
    this.setEventHandler();
    this.themecolor = this.setThemeColor("cool");
    if (!this.clockmode) {
      this.cv1 = {}; //canvasで使うための状態を保持するオブジェクト
      this.cv2 = {};
      this.cv3 = {};
      this.init_canvas();
    }
    this.initVariables();
    this.settingVars = {}; //設定内容を保持するオブジェクト
    if (BgUtil.isIOS()) { $("#tr_vibration").hide(); } //iOSのときはバイブレーションの設定項目を表示しない
  }

  //DOM定義
  setDomNames() {
    this.applybtn = $("#applybtn");
    this.cancelbtn = $("#cancelbtn");
    this.settingbtn = $("#settingbtn");
    this.pausebtn = $("#pausebtn");
    this.scorecard = $("#score1, #score2");
    this.settingwindow = $("#settingwindow");
    this.clockarea = this.clockmode ? $("#clock1, #clock2") : $("#clock1cv, #clock2cv");
    this.pauseinfo = $("#pauseinfo")
    this.matchlength = $("#matchlength");
    this.selminpoint = $("#selminpoint");
    this.seldelay = $("#delaytime");
    this.theme = $("#theme");
  }

  //イベントハンドラの定義
  setEventHandler() {
    //設定画面の[APPLY]ボタンがクリックされたとき
    this.applybtn.on("click", () => {
      this.initVariables();
      this.flipcard.showMainPanel();
    });

    //設定画面の[CANCEL]ボタンがクリックされたとき
    this.cancelbtn.on("click", () => {
      this.flipcard.showMainPanel();
      this.loadSettingVars(); //transitionが終わってから書き戻す
    });

    //メイン画面の[SETTINGS]ボタンがクリックされたとき
    this.settingbtn.on("click", () => {
      if (!this.pauseflg) { return; } //ポーズ時でなければ何もしない
      const topleft = this.winposition(this.settingwindow);
      this.settingwindow.css(topleft);
      this.flipcard.showSettingPanel();
      this.saveSettingVars(); //元の値を覚えておく
    });

    //メイン画面の[PAUSE] ボタンがクリックされたとき
    this.pausebtn.on("click", () => {
      this.pauseAction();
    });

    //スコアカードがスワイプあるいはタップされたとき→1枚めくる
    this.scorecard.on("swiperight swipeleft tap", (e) => {
      if (!this.pauseflg) { return; } //スコアカードがめくれるのはポーズ時のみ
      this.flipcard.driveEvent(e);
    });

    //クロックの場所がクリック(タップ)されたとき
    this.clockarea.on("touchstart mousedown", (e) => {
      e.preventDefault(); // touchstart以降のイベントを発生させない
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
  initVariables() {
    this.soundflg = $("[name=sound]").prop("checked");
    this.vibrationflg = $("[name=vibration]").prop("checked");
    this.hourhandflg = $("[name=hourhand]").prop("checked");
    this.pauseflg = true; //pause状態で起動する
    this.clockplayer = 0; //手番をリセット
    this.timeoutflg = false;
    this.flipcard.resetScore();
    this.setClockOption();
  }

  setClockOption() {
    const time = 60 * this.get_allowtimemin(); //設定時間 = ポイント数 x 時間(分) x 60(秒)
    this.clock = [0, time, time];
    this.delayInit = parseInt(this.seldelay.val());

    this.dispTimer(1, time, "pause");
    this.dispTimer(2, time, "pause");
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
    const clockspd = 1000;
    this.clockobj = setInterval(() => this.countdownClock(this.clockplayer, clockspd), clockspd);
    //アロー関数で呼び出すことで、コールバック関数内でthisが使える
  }

  stopTimer() {
    clearInterval(this.clockobj);
  }

  //クロックをカウントダウン
  countdownClock(player, clockspd) {
    if (this.delay > 0) {
      //保障時間内
      this.delay -= clockspd / 1000;
      this.dispDelay(player, this.delay);
    } else {
      //保障時間切れ後
      $("#delay" + player).hide();
      this.clock[player] -= clockspd / 1000;
      this.dispTimer(player, this.clock[player], "teban");
      if (this.clock[player] <= 0) {
        this.timeupLose(player); //切れ負け処理
      }
    }
  }

  //切れ負け処理
  timeupLose(player) {
    this.stopTimer();
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
      $("#delay" + player).text(Math.trunc(delay));
    } else {
      this.draw_delayframe(this.delayInit, delay);
    }
  }

  dispTimer(player, time, stat) {
    if (this.clockmode) {
      if (time < 0) { time = 0; }
      const min = Math.trunc(time / 60);
      const sec = Math.trunc(time % 60);
      const timestr = ("00" + min).slice(-2) + ":" + ("00" + sec).slice(-2);
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

  writeAllotedtime() {
    const clockminutes = this.get_allowtimemin();
    $("#allotedtime").text(clockminutes);
  }

  //音とバイブレーション
  sound_vibration(type) {
    this.sound(type);
    this.vibration(type);
  }

  //音を鳴らす
  sound(type) {
    if (this.soundflg) {
      const audio = $("#" + type).get(0); //音の種類は引数で指定
      //audio.load(); //連続再生に対応
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

  //画面中央に表示するための左上座標を計算
  winposition(winobj) {
    let wx = $(document).scrollLeft() + ($(window).width() - winobj.outerWidth()) / 2;
    if (wx < 0) { wx = 0; }
    let wy = $(document).scrollTop() + ($(window).height() - winobj.outerHeight()) / 2;
    if (wy < 0) { wy = 0; }
    return {top:wy, left:wx};
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
    this.cv1.width  = $("#clock1").width();
    this.cv1.height = $("#clock1").height();
    this.cv2.width  = $("#clock2").width();
    this.cv2.height = $("#clock2").height();
    this.cv3.width  = $("#delay").width();
    this.cv3.height = $("#delay").height();
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
    this.settingVars.matchlength = $("#matchlength").val();
    this.settingVars.selminpoint = $("#selminpoint").val();
    this.settingVars.delaytime   = $("#delaytime").val();
    this.settingVars.sound       = $("[name=sound]").prop("checked");
    this.settingVars.vibration   = $("[name=vibration]").prop("checked");
    this.settingVars.hourhand    = $("[name=hourhand]").prop("checked");
  }

  loadSettingVars() {
    $("#matchlength")    .val(this.settingVars.matchlength);
    $("#selminpoint")    .val(this.settingVars.selminpoint);
    $("#delaytime")      .val(this.settingVars.delaytime);
    $("[name=sound]")    .prop("checked", this.settingVars.sound);
    $("[name=vibration]").prop("checked", this.settingVars.vibration);
    $("[name=hourhand]") .prop("checked", this.settingVars.hourhand);
    $("#allotedtime")    .text(this.get_allowtimemin());
  }

  //テーマカラーを変更
  changeTheme(theme) {
    $("body").removeClass("warm cool mono").addClass(theme);
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