import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuxActions from './AuxActions.js';

describe('AuxActions', () => {
  test('invokes handlers and opens LifeWiki', () => {
    const onOpenChart = jest.fn();
    const onOpenHelp = jest.fn();
    const onOpenAbout = jest.fn();
    const onOpenOptions = jest.fn();
    const onOpenUser = jest.fn();
    const onOpenImport = jest.fn();
    const onOpenSupport = jest.fn();
    const onOpenPhotoTest = jest.fn();
    const onOpenScript = jest.fn();
    const onOpenAssistant = jest.fn();
    const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);

    render(
      <AuxActions
        onOpenChart={onOpenChart}
        onOpenHelp={onOpenHelp}
        onOpenAbout={onOpenAbout}
        onOpenOptions={onOpenOptions}
        onOpenUser={onOpenUser}
        onOpenImport={onOpenImport}
        onOpenSupport={onOpenSupport}
        onOpenPhotoTest={onOpenPhotoTest}
        onOpenScript={onOpenScript}
        onOpenAssistant={onOpenAssistant}
        showAssistant={true}
        showPhotoTest={true}
        loggedIn={false}
      />
    );

    fireEvent.click(screen.getByLabelText('script-playground'));
    fireEvent.click(screen.getByLabelText('ai-assistant'));
    fireEvent.click(screen.getByLabelText('photosensitivity-test'));
    fireEvent.click(screen.getByLabelText('chart'));
    fireEvent.click(screen.getByLabelText('import'));
    fireEvent.click(screen.getByLabelText('lifewiki'));
    fireEvent.click(screen.getByLabelText('support'));
    fireEvent.click(screen.getByLabelText('help'));
    fireEvent.click(screen.getByLabelText('about'));
    fireEvent.click(screen.getByLabelText('options'));
    fireEvent.click(screen.getByLabelText('user-profile'));

    expect(onOpenScript).toHaveBeenCalledTimes(1);
    expect(onOpenAssistant).toHaveBeenCalledTimes(1);
    expect(onOpenPhotoTest).toHaveBeenCalledTimes(1);
    expect(onOpenChart).toHaveBeenCalledTimes(1);
    expect(onOpenImport).toHaveBeenCalledTimes(1);
    expect(onOpenSupport).toHaveBeenCalledTimes(1);
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
    expect(onOpenOptions).toHaveBeenCalledTimes(1);
    expect(onOpenUser).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('https://conwaylife.com/wiki/Main_Page', '_blank');

    openSpy.mockRestore();
  });

  test('shows compact mobile More menu and routes hidden actions', () => {
    const onOpenChart = jest.fn();
    const onOpenHelp = jest.fn();
    const onOpenAbout = jest.fn();
    const onOpenOptions = jest.fn();
    const onOpenUser = jest.fn();
    const onOpenImport = jest.fn();
    const onOpenSupport = jest.fn();
    const onOpenPhotoTest = jest.fn();
    const onOpenScript = jest.fn();
    const onOpenAssistant = jest.fn();
    const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);

    render(
      <AuxActions
        onOpenChart={onOpenChart}
        onOpenHelp={onOpenHelp}
        onOpenAbout={onOpenAbout}
        onOpenOptions={onOpenOptions}
        onOpenUser={onOpenUser}
        onOpenImport={onOpenImport}
        onOpenSupport={onOpenSupport}
        onOpenPhotoTest={onOpenPhotoTest}
        onOpenScript={onOpenScript}
        onOpenAssistant={onOpenAssistant}
        showAssistant={true}
        showPhotoTest={true}
        photoTestEnabled={true}
        loggedIn={false}
        compact={true}
      />
    );

    fireEvent.click(screen.getByLabelText('import'));
    fireEvent.click(screen.getByLabelText('options'));
    fireEvent.click(screen.getByLabelText('user-profile'));

    expect(screen.queryByLabelText('chart')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('script-playground')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('more-actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Script Playground/i }));

    fireEvent.click(screen.getByLabelText('more-actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /AI Assistant/i }));

    fireEvent.click(screen.getByLabelText('more-actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Photosensitivity Test/i }));

    fireEvent.click(screen.getByLabelText('more-actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Chart$/i }));

    fireEvent.click(screen.getByLabelText('more-actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /LifeWiki/i }));

    fireEvent.click(screen.getByLabelText('more-actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Support$/i }));

    fireEvent.click(screen.getByLabelText('more-actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Help$/i }));

    fireEvent.click(screen.getByLabelText('more-actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /About \(Version info\)/i }));

    expect(onOpenImport).toHaveBeenCalledTimes(1);
    expect(onOpenOptions).toHaveBeenCalledTimes(1);
    expect(onOpenUser).toHaveBeenCalledTimes(1);
    expect(onOpenScript).toHaveBeenCalledTimes(1);
    expect(onOpenAssistant).toHaveBeenCalledTimes(1);
    expect(onOpenPhotoTest).toHaveBeenCalledTimes(1);
    expect(onOpenChart).toHaveBeenCalledTimes(1);
    expect(onOpenSupport).toHaveBeenCalledTimes(1);
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('https://conwaylife.com/wiki/Main_Page', '_blank');

    openSpy.mockRestore();
  });
});

