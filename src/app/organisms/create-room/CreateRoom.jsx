import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './CreateRoom.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { isRoomAliasAvailable } from '../../../util/matrixUtil';
import * as roomActions from '../../../client/action/room';
import { selectRoom } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Toggle from '../../atoms/button/Toggle';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import SegmentControl from '../../atoms/segmented-controls/SegmentedControls';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import HashPlusIC from '../../../../public/res/ic/outlined/hash-plus.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

function CreateRoom({ isOpen, onRequestClose }) {
  const [isPublic, togglePublic] = useState(false);
  const [isEncrypted, toggleEncrypted] = useState(true);
  const [isValidAddress, updateIsValidAddress] = useState(null);
  const [isCreatingRoom, updateIsCreatingRoom] = useState(false);
  const [creatingError, updateCreatingError] = useState(null);

  const [titleValue, updateTitleValue] = useState(undefined);
  const [topicValue, updateTopicValue] = useState(undefined);
  const [addressValue, updateAddressValue] = useState(undefined);
  const [roleIndex, setRoleIndex] = useState(0);

  const addressRef = useRef(null);
  const topicRef = useRef(null);
  const nameRef = useRef(null);

  const userId = initMatrix.matrixClient.getUserId();
  const hsString = userId.slice(userId.indexOf(':'));

  function resetForm() {
    togglePublic(false);
    toggleEncrypted(true);
    updateIsValidAddress(null);
    updateIsCreatingRoom(false);
    updateCreatingError(null);
    updateTitleValue(undefined);
    updateTopicValue(undefined);
    updateAddressValue(undefined);
    setRoleIndex(0);
  }

  const onCreated = (roomId) => {
    resetForm();
    selectRoom(roomId);
    onRequestClose();
  };

  useEffect(() => {
    const { roomList } = initMatrix;
    roomList.on(cons.events.roomList.ROOM_CREATED, onCreated);
    return () => {
      roomList.removeListener(cons.events.roomList.ROOM_CREATED, onCreated);
    };
  }, []);

  async function createRoom() {
    if (isCreatingRoom) return;
    updateIsCreatingRoom(true);
    updateCreatingError(null);
    const name = nameRef.current.value;
    let topic = topicRef.current.value;
    if (topic.trim() === '') topic = undefined;
    let roomAlias;
    if (isPublic) {
      roomAlias = addressRef?.current?.value;
      if (roomAlias.trim() === '') roomAlias = undefined;
    }

    const powerLevel = roleIndex === 1 ? 101 : undefined;

    try {
      await roomActions.create({
        name, topic, isPublic, roomAlias, isEncrypted, powerLevel,
      });
    } catch (e) {
      if (e.message === 'M_UNKNOWN: Invalid characters in room alias') {
        updateCreatingError('ERROR: Invalid characters in room address');
        updateIsValidAddress(false);
      } else if (e.message === 'M_ROOM_IN_USE: Room alias already taken') {
        updateCreatingError('ERROR: Room address is already in use');
        updateIsValidAddress(false);
      } else updateCreatingError(e.message);
      updateIsCreatingRoom(false);
    }
  }

  function validateAddress(e) {
    const myAddress = e.target.value;
    updateIsValidAddress(null);
    updateAddressValue(e.target.value);
    updateCreatingError(null);

    setTimeout(async () => {
      if (myAddress !== addressRef.current.value) return;
      const roomAlias = addressRef.current.value;
      if (roomAlias === '') return;
      const roomAddress = `#${roomAlias}${hsString}`;

      if (await isRoomAliasAvailable(roomAddress)) {
        updateIsValidAddress(true);
      } else {
        updateIsValidAddress(false);
      }
    }, 1000);
  }
  function handleTitleChange(e) {
    if (e.target.value.trim() === '') updateTitleValue(undefined);
    updateTitleValue(e.target.value);
  }
  function handleTopicChange(e) {
    if (e.target.value.trim() === '') updateTopicValue(undefined);
    updateTopicValue(e.target.value);
  }

  return (
    <PopupWindow
      isOpen={isOpen}
      title="Create room"
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
      onRequestClose={onRequestClose}
    >
      <div className="create-room">
        <form className="create-room__form" onSubmit={(e) => { e.preventDefault(); createRoom(); }}>
          <SettingTile
            title="Make room public"
            options={<Toggle isActive={isPublic} onToggle={togglePublic} />}
            content={<Text variant="b3">Public room can be joined by anyone.</Text>}
          />
          {isPublic && (
            <div>
              <Text className="create-room__address__label" variant="b2">Room address</Text>
              <div className="create-room__address">
                <Text variant="b1">#</Text>
                <Input value={addressValue} onChange={validateAddress} state={(isValidAddress === false) ? 'error' : 'normal'} forwardRef={addressRef} placeholder="my_room" required />
                <Text variant="b1">{hsString}</Text>
              </div>
              {isValidAddress === false && <Text className="create-room__address__tip" variant="b3"><span style={{ color: 'var(--bg-danger)' }}>{`#${addressValue}${hsString} is already in use`}</span></Text>}
            </div>
          )}
          {!isPublic && (
            <SettingTile
              title="Enable end-to-end encryption"
              options={<Toggle isActive={isEncrypted} onToggle={toggleEncrypted} />}
              content={<Text variant="b3">You can’t disable this later. Bridges & most bots won’t work yet.</Text>}
            />
          )}
          <SettingTile
            title="Select your role"
            options={(
              <SegmentControl
                selected={roleIndex}
                segments={[{ text: 'Admin' }, { text: 'Founder' }]}
                onSelect={setRoleIndex}
              />
            )}
            content={(
              <Text variant="b3">Override the default (100) power level.</Text>
            )}
          />
          <Input value={topicValue} onChange={handleTopicChange} forwardRef={topicRef} minHeight={174} resizable label="Topic (optional)" />
          <div className="create-room__name-wrapper">
            <Input value={titleValue} onChange={handleTitleChange} forwardRef={nameRef} label="Room name" required />
            <Button disabled={isValidAddress === false || isCreatingRoom} iconSrc={HashPlusIC} type="submit" variant="primary">Create</Button>
          </div>
          {isCreatingRoom && (
            <div className="create-room__loading">
              <Spinner size="small" />
              <Text>Creating room...</Text>
            </div>
          )}
          {typeof creatingError === 'string' && <Text className="create-room__error" variant="b3">{creatingError}</Text>}
        </form>
      </div>
    </PopupWindow>
  );
}

CreateRoom.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

export default CreateRoom;
