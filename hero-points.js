/**
 * hero-points.js — Greenbottle's Hero Points
 *
 * Adds a "Assign Hero Points" button to the GM's token controls toolbar.
 * Clicking it opens a dialog with four bulk operations for the whole party:
 *   - Add 1      → increment every member by 1 (stops at max)
 *   - Set all to 2 → set everyone to exactly 2
 *   - Top up     → bring anyone below 2 up to 2 (skips those already at 2+)
 *   - Clear      → set everyone to 0
 *
 * Only GMs can see the button. Uses the PF2e party system to get party members.
 * Hero points live at: actor.system.resources.heroPoints.value / .max
 */

// ── Token Controls Button ────────────────────────────────────────────────────
// getSceneControlButtons fires when Foundry builds the left-side toolbar.
// We hook in here to inject our button into the "Token" section.
Hooks.on("getSceneControlButtons", controls => {
  if (!game.user.isGM) return; // Only GMs can see and use this button

  const tokenControls = controls.find(control => control.name === "token"); // Locate the Token Controls section
  if (!tokenControls) {
    console.error("Token controls not found!");
    return;
  }

  tokenControls.tools.push({
    name: "heroPoints",
    title: "Assign Hero Points", // Tooltip text shown on hover
    icon: "fas fa-star",         // Font Awesome star icon
    onClick: () => openHeroPointsDialog(),
    button: true
  });

  // Commented-out button: lists party members in chat (kept for reference/testing)
  // tokenControls.tools.push({
  //   name: "listPartyMembers",
  //   title: "List Party Members",
  //   icon: "fas fa-users",
  //   onClick: () => listPartyMembersInChat(),
  //   button: true
  // });

  console.log("Hero Points button added to token controls!");
});


// ── Dialog ───────────────────────────────────────────────────────────────────

/**
 * Opens the Hero Points dialog with four bulk action buttons.
 * Reads the current PF2e party from game.actors.party.
 */
function openHeroPointsDialog() {
  const party = game.actors.party?.members;

  if (!party || party.length === 0) {
    ui.notifications.warn("No party members found in the Pathfinder 2e party!");
    console.error("No party members found in the Pathfinder 2e party!");
    return;
  }

  new Dialog({
    title: "Assign Hero Points",
    content: `<p>How many hero points should party members receive?</p>`,
    buttons: {
      one: {
        label: "add 1",
        callback: () => updateHeroPoints(1, party, 'add')      // Add 1 to each member (respects max)
      },
      two: {
        label: "set all to 2",
        callback: () => updateHeroPoints(2, party, 'set')      // Set everyone to exactly 2
      },
      three: {
        label: "top up",
        callback: () => updateHeroPoints(2, party, 'top-up')   // Bring anyone below 2 up to 2
      },
      four: {
        label: "clear",
        callback: () => updateHeroPoints(0, party, 'set')      // Clear everyone to 0
      }
    },
    default: "two" // "set all to 2" is pre-selected
  }).render(true);

  console.log("Hero Points dialog opened!");
}


// ── Update Logic ─────────────────────────────────────────────────────────────

/**
 * Updates hero points for every member of the party according to the chosen mode.
 *
 * @param {number} amount  The target or delta value depending on mode.
 * @param {Actor[]} party  Array of party member Actors from game.actors.party.
 * @param {'add'|'set'|'top-up'} type  How to apply the amount:
 *   - 'add'    → add `amount` to current value, stop if already at max
 *   - 'set'    → set everyone to exactly `amount` (also used for clear with amount=0)
 *   - 'top-up' → only update members whose current value is below `amount`
 */
function updateHeroPoints(amount, party, type) {
  for (const member of party) {
    console.log(member.prototypeToken.name);
    let heropoints = member.system.resources.heroPoints.value;

    if (type === 'add') {
      // Skip members already at max — can't go over the cap.
      if (heropoints >= member.system.resources.heroPoints.max) {
        ui.notifications.info(`${member.prototypeToken.name || 'NAME'} is already at the max hero points`);
        continue; // Move on to the next party member
      }

      const newAmount = heropoints += amount;

      member.update({
        'system.resources.heroPoints.value': newAmount
      }).then(() => {
        ui.notifications.info(`${member.prototypeToken.name}'s Hero Points have been updated to ${newAmount}`);
      }).catch(error => {
        console.error(`Failed to update Hero Points for ${member.prototypeToken.name}:`, error);
        ui.notifications.error(`Failed to update Hero Points for ${member.prototypeToken.name}`);
      });
    }

    else if (type === 'set') {
      // Directly overwrite with the given amount (used by both "set all to 2" and "clear").
      member.update({
        'system.resources.heroPoints.value': amount
      }).then(() => {
        ui.notifications.info(`${member.prototypeToken.name}'s Hero Points have been updated to ${amount}`);
      }).catch(error => {
        console.error(`Failed to update Hero Points for ${member.prototypeToken.name}:`, error);
        ui.notifications.error(`Failed to update Hero Points for ${member.prototypeToken.name}`);
      });
    }

    else if (type === 'top-up') {
      // Skip members who already have enough — only boost those below the target.
      if (heropoints >= amount) {
        ui.notifications.info(`${member.prototypeToken.name} already has enough Hero Points!`);
        continue;
      }

      const updateData = {
        'system.resources.heroPoints.value': amount
      };

      member.update(updateData)
        .then(() => {
          ui.notifications.info(`${member.prototypeToken.name}'s Hero Points have been updated to ${amount}`);
        }).catch(error => {
          console.error(`Failed to update Hero Points for ${member.prototypeToken.name}:`, error);
          ui.notifications.error(`Failed to update Hero Points for ${member.prototypeToken.name}`);
        });
    }

    else {
      ui.notifications.error(`something went wrong!`);
    }
  }
}


// ── Debug / Testing Utilities ─────────────────────────────────────────────────

/**
 * Prints a table of party members (name, level, class, hero points) to chat.
 * Not wired into any button — left here for manual testing from the console.
 */
function listPartyMembersInChat() {
  const partyMembers = game.actors.party?.members;

  if (!partyMembers || partyMembers.length === 0) {
    ui.notifications.warn("No party members found in the Pathfinder 2e party!");
    console.error("No party members found in the Pathfinder 2e party!");
    return;
  }

  let messageContent = `
    <h2>Party Members</h2>
    <table style="width: 100%; text-align: left; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border-bottom: 1px solid #ddd;">Name</th>
          <th style="border-bottom: 1px solid #ddd;">Level</th>
          <th style="border-bottom: 1px solid #ddd;">Class</th>
          <th style="border-bottom: 1px solid #ddd;">Hero Points</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const actor of partyMembers) {
    const level = actor.system?.details?.level?.value || "N/A";
    const className = actor.items.find(item => item.type === 'class')?.name || 'N/A';

    messageContent += `
      <tr>
        <td>${actor.prototypeToken.name}</td>
        <td>${level}</td>
        <td>${className}</td>
        <td>${actor.system.resources.heroPoints.value}/${actor.system.resources.heroPoints.max}</td>
      </tr>
    `;
  }

  messageContent += `
      </tbody>
    </table>
  `;

  ChatMessage.create({
    content: messageContent,
    speaker: { alias: "Party Tool" }
  });

  console.log("Party Members listed in chat!");
}

// Quick console shortcuts for manual testing (uncomment to run directly):
// updateHeroPoints(1, game.actors.party?.members, 'add');
// openHeroPointsDialog();
// listPartyMembersInChat();
