// BgClock_class.js
'use strict';

class BgClock {
  constructor(gameobj, clockmode = true) {
    this.parentobj = gameobj;
    this.clockmode = clockmode;
    this.clock = [0, 600, 600];
    this.delayInit = 12;
    this.delay = this.delayInit;
    this.clockplayer = 0;
    this.clockobj = 0;

    this.clockmodeflg = true;
    this.pauseMode = false; //true=ゲーム中、false=ゲーム開始前
    this.setDomNames();
  }

  setDomNames() {
    this.pausebtn    = $("#pausebtn");
    this.matchlen    = $("#matchlength");
    this.selminpoint = $("#allotedtimemin"); //selminpoint
    this.seldelay    = $("#delaytime");
  }

  //クロックタイマー用ロジック
  tapTimer(turn) {
    if (!this.clockmodeflg) { return; }

    this.clockplayer = turn;
    const player = this.clockplayer;
    const oppo = BgUtil.getBdOppo(this.clockplayer);

    this.pauseMode = true; //ゲーム中モード
    this.delay = this.delayInit; //保障時間を設定
    this.stopTimer(); //相手方のクロックをストップし
    this.startTimer(this.pauseMode); //自分方のクロックをスタートさせる

    this.dispDelay(player, this.delay);
    if (this.clockmode) {
      $("#delay" + player).show();
      $("#delay" + oppo).hide();
    }

    if (this.clockmode) {
      $("#clock" + player).removeClass("noteban teban_pause").addClass("teban");
      $("#clock" + oppo).removeClass("teban teban_pause").addClass("noteban");
    } else {
      this.dispTimer(player, this.clock[player], "teban");
      this.dispTimer(oppo, this.clock[oppo], "noteban");
    }
  }

  pauseTimer(pausemode) {
    this.stopTimer();
    this.pauseMode = pausemode ? this.pauseMode : false;
    if (!pausemode && this.clockmode) {
      $(".delay").hide(); //ゲーム終了時にはディレイは非表示
    } //ポーズボタン、設定ボタンが押されたとき(ゲーム中モード時)はディレイはそのまま表示
  }

  //クロックをカウントダウン
  countdownClock(player, clockspd) {
    if (this.delay > 0) {
      //保障時間内
      this.delay -= clockspd / 1000;
      this.dispDelay(player, this.delay);
      //$("#delay" + player).text(Math.trunc(this.delay));
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

  startTimer() {
    if (!this.pauseMode) { return; }
    const clockspd = 1000;
    this.clockobj = setInterval(() => this.countdownClock(this.clockplayer, clockspd), clockspd);
    //アロー関数で呼び出すことで、コールバック関数内でthisが使える
  }

  stopTimer() {
    clearInterval(this.clockobj);
  }

  dispDelay(player, delay) {
    if (this.clockmode) {
      $("#delay" + player).text(Math.trunc(delay));
    } else {
      this.parentobj.draw_delayframe(this.delayInit, delay);
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
      this.parentobj.draw_timerframe(player, time, stat);
    }
  }

  timeupLose(player) {
    this.pauseTimer(false);
    this.parentobj.timeupLose(player);
  }

  setClockOption() {
    const matchlength = parseInt(this.matchlen.val());
    const selminpoint = parseFloat(this.selminpoint.val());
    const maxmin = this.clockmode ? 100 : 720; //analogの最大値は720分(12時間)
    const time = (matchlength == 0) ? maxmin * 60 : Math.ceil(matchlength * selminpoint) * 60;
    //設定時間 = ポイント数 x 時間(分) で分単位に切り上げ。このアプリは秒で管理するため、60を掛ける

    this.clock = [0, time, time];
    this.delayInit = parseInt(this.seldelay.val());
    this.dispTimer(1, time, "pause");
    this.dispTimer(2, time, "pause");
    this.dispDelay(1, this.delayInit);
    this.dispDelay(2, this.delayInit);
  }

}
