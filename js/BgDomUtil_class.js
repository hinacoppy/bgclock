// BgDomUtil_class.js
// DOM utility functions (jQuery-free)。OtokogiGammonSvgのOgUtil_class.jsと同じ設計方針。
'use strict';

class BgDomUtil {
  static show(el) { el.style.display = ""; } //style未指定時のCSS表示状態に戻す
  static hide(el) { el.style.display = "none"; }
  static toggle(el, show) { show ? BgDomUtil.show(el) : BgDomUtil.hide(el); } //jQueryの.toggle(bool)相当

  static setPos(el, pos) { //jQueryの.css({left,top,bottom})相当
    if (pos.left   !== undefined) { el.style.left   = pos.left   + "px"; }
    if (pos.top    !== undefined) { el.style.top    = pos.top    + "px"; }
    if (pos.bottom !== undefined) { el.style.bottom = pos.bottom + "px"; }
  }

  //空白区切りの複数クラス名に対応(jQueryの.addClass()/.removeClass()相当)。
  //空文字トークンが混ざっても(例:["", "stackcol1"].join(" "))classList.add/removeが例外を投げないようフィルタする
  static addClass(el, classNames) {
    const list = classNames.split(" ").filter(Boolean);
    if (list.length) { el.classList.add(...list); }
  }
  static removeClass(el, classNames) {
    const list = classNames.split(" ").filter(Boolean);
    if (list.length) { el.classList.remove(...list); }
  }

  //jQueryの.height()/.width()相当(border-boxを除いた内容領域=content+paddingからpaddingを引いたサイズ)
  //clientHeight/Widthはborder-boxのサイズ指定やborder幅に関係なく常にborderを含まないため、
  //ボード枠(.boardのborder)があってもjQueryの.height()と同じ値になる
  static contentHeight(el) {
    const cs = getComputedStyle(el);
    return el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  }
  static contentWidth(el) {
    const cs = getComputedStyle(el);
    return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  //display:noneの要素はgetBoundingClientRect()が0を返すため、
  //一時的に表示状態にして計測してから元に戻す(jQueryは非表示要素でも正しく計測できるため、それに合わせる)
  static measureHidden(el, fn) {
    if (getComputedStyle(el).display !== "none") { return fn(); }
    const prevDisplay = el.style.display;
    const prevVisibility = el.style.visibility;
    el.style.visibility = "hidden";
    el.style.display = "block";
    const result = fn();
    el.style.display = prevDisplay;
    el.style.visibility = prevVisibility;
    return result;
  }

  //jQueryの.outerWidth(true)/.outerHeight(true)相当(border+paddingを含み、includeMargin時はmarginも含む)
  static outerWidth(el, includeMargin) {
    return BgDomUtil.measureHidden(el, () => {
      const rect = el.getBoundingClientRect();
      if (!includeMargin) { return rect.width; }
      const cs = getComputedStyle(el);
      return rect.width + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
    });
  }
  static outerHeight(el, includeMargin) {
    return BgDomUtil.measureHidden(el, () => {
      const rect = el.getBoundingClientRect();
      if (!includeMargin) { return rect.height; }
      const cs = getComputedStyle(el);
      return rect.height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    });
  }

  //jQueryの.animate({left,top}, duration).promise()相当
  static animatePos(el, pos, duration) {
    return new Promise((resolve) => {
      el.style.transition = `left ${duration}ms, top ${duration}ms`;
      requestAnimationFrame(() => { BgDomUtil.setPos(el, pos); });
      setTimeout(() => {
        el.style.transition = "";
        resolve();
      }, duration);
    });
  }
}
