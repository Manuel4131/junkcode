#include "missionqueue.h"

#include <functional>

MissionQueue::MissionQueue(Database & db, JobQueue * jq):
_decks(),
_db(db),
_jq(jq) {
}

void MissionQueue::start(int api_deck_id, int api_mission_id) {
    if (this->_decks.count(api_deck_id) == 1) {
        return;
    }

    auto deck = this->_db.getDeck(api_deck_id);
    auto msCompleteTime = deck["mission_time"].toLongLong();
    auto missionStatus = deck["mission_status"].toInt();
    if (missionStatus <= 0) {
        // ready
        msCompleteTime = this->_doStart(api_deck_id, api_mission_id);
        if (msCompleteTime <= 0LL) {
            // error
            return;
        }
    }

    // queue next action on complete
    this->_queueNext(msCompleteTime, api_deck_id, api_mission_id);
}

qint64 MissionQueue::_doStart(int api_deck_id, int api_mission_id) {
    // TODO api class
    bool ok = false;
    if (!ok) {
        return 0LL;
    }

    auto deck = this->_db.getDeck(api_deck_id);
    auto msCompleteTime = deck["mission_time"].toLongLong();
    return msCompleteTime;
}

void MissionQueue::_queueNext(qint64 msCompleteTime, int api_deck_id, int api_mission_id) {
    auto cb = std::bind(&MissionQueue::_onDone, this, std::placeholders::_1, api_deck_id, api_mission_id);
    qint64 handle = this->_jq->runAt(msCompleteTime, cb);
    this->_decks.insert(std::make_pair(api_deck_id, handle));
}

void MissionQueue::_onDone(const QtCoroutine::Yield &/*yield*/, int api_deck_id, int api_mission_id) {
    if (this->_decks.count(api_deck_id) != 1) {
        return;
    }

    auto msCompleteTime = this->_doStart(api_deck_id, api_mission_id);
    if (msCompleteTime <= 0) {
        return;
    }

    this->_queueNext(msCompleteTime, api_deck_id, api_mission_id);
}
