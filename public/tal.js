/* Allt appen säger utöver nivåtexterna, på ett ställe. Läses av appen och av verify.cjs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TAL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    valkommen: 'Ljuslabbet. Dra i ratten på spegeln tills strålen träffar lampan.'
  };
});
