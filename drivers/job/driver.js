'use strict';

const Homey = require('homey');

// Taken die we standaard aanbieden, ook als er nog nooit iets binnenkwam.
const STANDAARD = ['appdata', 'books'];

class JobDriver extends Homey.Driver {

  async onPairListDevices() {
    const app = this.homey.app;
    const gekoppeld = app.getJobDevices().map((d) => d.getData().id);

    // Taken die zich al gemeld hebben staan bovenaan: die zijn zeker juist
    // gespeld, want ze komen rechtstreeks uit een echt rapport.
    const gezien = app.getSeenJobs();
    const kandidaten = [...new Set([...gezien, ...STANDAARD])]
      .filter((id) => !gekoppeld.includes(id));

    return kandidaten.map((id) => ({
      name: this.homey.__('job_name', { job: id }) || `Back-up: ${id}`,
      data: { id },
    }));
  }

}

module.exports = JobDriver;
