'use strict';

module.exports = {

  /**
   * Ontvangt het resultaat van een back-uptaak.
   * Publiek bereikbaar, zodat een script op de server geen token nodig heeft:
   *
   *   POST http://<homey>/api/app/dev.rymenants.backupwatch/report
   *   { "job": "books", "status": "ok", "message": "270 bestanden", "files": 270 }
   */
  async report({ homey, body }) {
    return homey.app.handleReport(body);
  },

  /** Overzicht van bekende taken; handig om te controleren of alles aankomt. */
  async jobs({ homey }) {
    const devices = homey.app.getJobDevices().map((d) => ({
      job: d.getData().id,
      name: d.getName(),
      state: d.getCapabilityValue('backup_state'),
      lastRun: d.getCapabilityValue('backup_last_run'),
      detail: d.getCapabilityValue('backup_detail'),
    }));
    return {
      paired: devices,
      seenButNotPaired: homey.app.getSeenJobs().filter(
        (id) => !devices.some((d) => d.job === id),
      ),
    };
  },

};
